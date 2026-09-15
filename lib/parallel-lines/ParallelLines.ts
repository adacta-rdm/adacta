/**
 * Turns a route made of horizontal and vertical segments into a set of
 * parallel lines.
 *
 * A diagram often needs more than one line to describe one connection. A
 * process pipe with a heating jacket, for example, is drawn as a centre line
 * with a line on each side of it. This module takes the SVG path of the route
 * and returns the centre line, the two side lines, and two background shapes.
 *
 * The caller decides which of the returned paths to draw. Drawing only the
 * centre line gives a plain line. Drawing all three gives a jacketed line.
 * Drawing the two side lines alone gives a pair of lines with nothing between
 * them.
 *
 * Every segment of the route must run horizontally or vertically. A diagram
 * drawn with right angles satisfies this. A diagonal segment does not, and the
 * result for one is undefined.
 */

/**
 * A point on the drawing, also used as a direction.
 */
export class Point {
	public constructor(
		public readonly x: number,
		public readonly y: number,
	) {}

	public add(other: Point): Point {
		return new Point(this.x + other.x, this.y + other.y);
	}

	public subtract(other: Point): Point {
		return new Point(this.x - other.x, this.y - other.y);
	}

	public scale(factor: number): Point {
		return new Point(this.x * factor, this.y * factor);
	}

	/**
	 * Multiplies each coordinate by the matching coordinate of another point.
	 *
	 * A direction multiplied this way keeps only the coordinate it travels
	 * along. For example, the direction (1, 0) multiplied by (4, 4) gives
	 * (4, 0).
	 */
	public times(other: Point): Point {
		return new Point(this.x * other.x, this.y * other.y);
	}

	public equals(other: Point): boolean {
		return this.x === other.x && this.y === other.y;
	}

	/**
	 * Swaps the coordinates, which turns a horizontal direction into a vertical
	 * one and the other way round. The result points across the original
	 * direction, which is where a parallel line sits.
	 */
	public swapped(): Point {
		return new Point(this.y, this.x);
	}
}

interface Segment {
	start: Point;
	end: Point;
}

export interface ParallelLinesOptions {
	/**
	 * The distance between the centre line and each side line.
	 */
	spacing: number;

	/**
	 * The width the caller draws the lines with. Corners are extended by half
	 * this width so that two segments meet without a notch.
	 */
	lineWidth: number;

	/**
	 * Whether to stop the centre line short of the end of the route. An arrow
	 * drawn at the end then has room. Defaults to true.
	 */
	shortenForArrow?: boolean;

	/**
	 * How far short of the end of the route the side lines stop, measured from
	 * that end. It defaults to the spacing.
	 *
	 * A jacket ends before the pipe reaches its connection, so some gap is
	 * usual. Widen it to clear an arrow drawn at the end. Pass zero when the
	 * side lines are the only ones drawn, because they must then reach the
	 * connection themselves.
	 */
	outerEndGap?: number;
}

export interface ParallelLines {
	/**
	 * The route itself.
	 */
	center: string;

	/**
	 * The two lines running beside the route, one on each side. Which side is
	 * which stays the same along the whole route.
	 */
	left: string;
	right: string;

	/**
	 * A shape covering the centre line. Filling it in the background color
	 * breaks any line drawn underneath, which is how a diagram shows that one
	 * line passes over another.
	 */
	centerBackground: string;

	/**
	 * The same shape, widened to cover the side lines as well.
	 */
	fullBackground: string;
}

/**
 * Returns the parallel lines for one route.
 */
export function parallelLines(path: string, options: ParallelLinesOptions): ParallelLines {
	const spacing = options.spacing;
	const lineWidth = options.lineWidth;
	const shortenForArrow = options.shortenForArrow ?? true;
	const outerEndGap = options.outerEndGap ?? spacing;

	const segments = straightSegments(readPoints(path), lineWidth);

	const lines: ParallelLines = {
		center: "",
		left: "",
		right: "",
		centerBackground: "",
		fullBackground: "",
	};

	for (const [index, segment] of segments.entries()) {
		const isLast = index === segments.length - 1;

		const part = segmentLines(segment, {
			spacing,
			lineWidth,
			shortenEnd: shortenForArrow && isLast,
			// A segment that meets another one keeps the spacing free for the
			// corner piece. Only the last segment takes the caller's gap.
			endInset: isLast ? outerEndGap : spacing,
		});

		lines.center += part.center;
		lines.left += part.left;
		lines.right += part.right;
		lines.centerBackground += part.centerBackground;
		lines.fullBackground += part.fullBackground;

		// A side line turns the corner outside the centre line, so the corner
		// piece belongs to whichever side the route turns away from.
		if (!isLast) {
			const corner = cornerLines(segment, segments[index + 1], spacing, lineWidth);

			lines.left += corner.left;
			lines.right += corner.right;
		}
	}

	return lines;
}

/**
 * Reads the points of a path built from "M" and "L" commands.
 */
function readPoints(path: string): Point[] {
	const points: Point[] = [];

	for (const match of path.matchAll(/([ML])([\d.,\s-]+)/g)) {
		const values = match[2].trim().split(/[\s,]+/);

		points.push(new Point(Number(values[0]), Number(values[1])));
	}

	return points;
}

/**
 * Turns the points of a route into the segments to draw.
 *
 * A segment of zero length is dropped. Two segments running the same way are
 * merged into one. The route therefore holds one segment per straight run,
 * whatever the path happened to contain.
 *
 * Each end that meets another segment is then moved outward by half the line
 * width. An end that meets a symbol is left where it is.
 */
function straightSegments(points: Point[], lineWidth: number): Segment[] {
	const runs: Segment[] = [];

	for (let index = 1; index < points.length; index++) {
		const segment: Segment = { start: points[index - 1], end: points[index] };

		if (direction(segment).equals(new Point(0, 0))) continue;

		const previous = runs[runs.length - 1];

		if (previous !== undefined && direction(previous).equals(direction(segment))) {
			runs[runs.length - 1] = { start: previous.start, end: segment.end };
			continue;
		}

		runs.push(segment);
	}

	return runs.map((segment, index) => {
		const reach = direction(segment).scale(lineWidth * 0.5);

		return {
			start: index > 0 ? segment.start.subtract(reach) : segment.start,
			end: index < runs.length - 1 ? segment.end.add(reach) : segment.end,
		};
	});
}

/**
 * Returns the paths for one straight segment.
 */
function segmentLines(
	segment: Segment,
	options: { spacing: number; lineWidth: number; shortenEnd: boolean; endInset: number },
): ParallelLines {
	const { spacing, lineWidth, shortenEnd, endInset } = options;

	const heading = direction(segment);
	const start = segment.start;
	const end = segment.end;

	// The centre line stops short of the end so that an arrow has room.
	const centerEnd = shortenEnd ? end.subtract(heading.scale(lineWidth)) : end;

	// The side lines sit across the direction of travel, one spacing away on
	// each side. They are measured from the end of the route rather than from
	// the centre line, so the caller's gap means what it says.
	const across = heading.swapped().scale(spacing);
	const along = heading.scale(spacing);

	const sideStartA = start.add(across).add(along);
	const sideStartB = start.subtract(across).add(along);

	const sideEnd = end.subtract(heading.scale(endInset));
	const sideEndA = sideEnd.add(across);
	const sideEndB = sideEnd.subtract(across);

	const sideA = lineBetween(sideStartA, sideEndA);
	const sideB = lineBetween(sideStartB, sideEndB);

	// Which of the two is "left" depends on the direction of travel. Ordering
	// them by that keeps a side line on the same side along the whole route.
	const runsHorizontally = direction({ start: sideStartA, end: sideEndA }).x !== 0;

	return {
		center: lineBetween(start, centerEnd),
		left: runsHorizontally ? sideA : sideB,
		right: runsHorizontally ? sideB : sideA,
		centerBackground: backgroundShape(start, end, lineWidth),
		fullBackground: backgroundShape(start, end, lineWidth + spacing),
	};
}

/**
 * Returns the piece that carries a side line around a corner.
 *
 * Only the outer side needs a piece. The inner side meets itself, because the
 * two straight parts already overlap there.
 */
function cornerLines(
	current: Segment,
	next: Segment,
	spacing: number,
	lineWidth: number,
): { left: string; right: string } {
	const oldHeading = direction(current);
	const newHeading = direction(next);

	const corner = current.end
		.add(new Point(spacing - lineWidth * 0.5, spacing - lineWidth * 0.5).times(oldHeading))
		.subtract(newHeading.scale(spacing));

	const approach = corner.subtract(oldHeading.scale(spacing * 2));
	const departure = corner.add(newHeading.scale(spacing * 2));

	const piece =
		pathOf(extendByWidth({ start: approach, end: corner }, lineWidth)) +
		pathOf(extendByWidth({ start: corner, end: departure }, lineWidth));

	// The cross product of the two directions says which way the route turns.
	const turn = oldHeading.x * newHeading.y - oldHeading.y * newHeading.x;

	return turn <= 0 ? { left: piece, right: "" } : { left: "", right: piece };
}

/**
 * Returns a rectangle around a segment, as a closed path.
 *
 * The rectangle reaches past the end of the segment by its own width. Two
 * rectangles meeting at a corner therefore leave no gap.
 */
function backgroundShape(start: Point, end: Point, size: number): string {
	const heading = direction({ start, end });
	const across = heading.swapped().scale(size);
	const far = end.add(heading.scale(size));

	const corners = [
		start.add(across),
		start.subtract(across),
		far.subtract(across),
		far.add(across),
	];

	return `M ${corners[0].x} ${corners[0].y} L ${corners[1].x} ${corners[1].y} L ${corners[2].x} ${corners[2].y} L ${corners[3].x} ${corners[3].y} Z `;
}

/**
 * Moves both ends of a segment outward by half the line width.
 *
 * A line drawn with a width covers a rectangle. Two such rectangles meeting at
 * a right angle leave a notch at the outer corner unless both reach past the
 * meeting point.
 */
function extendByWidth(segment: Segment, lineWidth: number): Segment {
	const heading = direction(segment).scale(lineWidth * 0.5);

	return { start: segment.start.subtract(heading), end: segment.end.add(heading) };
}

/**
 * Returns the direction of a segment as one step along each axis.
 *
 * For example, a segment running to the right gives (1, 0). A segment of zero
 * length gives (0, 0).
 */
function direction(segment: Segment): Point {
	const difference = segment.end.subtract(segment.start);

	return new Point(Math.sign(difference.x), Math.sign(difference.y));
}

function lineBetween(start: Point, end: Point): string {
	return `M ${start.x} ${start.y} L ${end.x} ${end.y} `;
}

function pathOf(segment: Segment): string {
	return lineBetween(segment.start, segment.end);
}
