import { PID_EDGE_KINDS, type PIDEdgeKind } from "~/app/lib/PID.ts";

export interface OrthogonalPathPosition {
	x: number;
	y: number;
	direction: { x: -1 | 0 | 1; y: -1 | 0 | 1 };
}

/** Returns true for a new pipe or jacketed connection. */
export function defaultEndArrow(kind: PIDEdgeKind): boolean {
	return kind === "pipe" || kind === "jacketed";
}

/** Checks the arrow values for one connection. */
export function isValidArrowConfiguration(
	kind: PIDEdgeKind,
	endArrow: boolean,
	positions: readonly number[],
): boolean {
	if (!PID_EDGE_KINDS[kind].supportsArrows && (endArrow || positions.length > 0)) return false;

	return (
		new Set(positions).size === positions.length &&
		positions.every((position) => Number.isInteger(position) && position >= 1 && position <= 99)
	);
}

/** Returns the arrow values after a connection changes kind. */
export function arrowsAfterKindChange(
	from: PIDEdgeKind,
	to: PIDEdgeKind,
	current: { endArrow: boolean; arrowPositions: readonly number[] },
): { endArrow: boolean; arrowPositions: number[] } {
	if (!PID_EDGE_KINDS[to].supportsArrows) return { endArrow: false, arrowPositions: [] };
	if (!PID_EDGE_KINDS[from].supportsArrows) {
		return { endArrow: defaultEndArrow(to), arrowPositions: [] };
	}

	return { endArrow: current.endArrow, arrowPositions: [...current.arrowPositions] };
}

/**
 * Returns the midpoint of the largest interval without an arrow.
 * Equal intervals are checked from source to target.
 * For example, the first three results are 50, 25, and 75.
 */
export function nextArrowPosition(positions: readonly number[]): number | undefined {
	const occupied = new Set(positions);
	if (occupied.size >= 99) return;

	const sorted = [0, ...occupied].sort((left, right) => left - right);
	sorted.push(100);

	let largestStart = 0;
	let largestEnd = 0;

	for (let index = 1; index < sorted.length; index++) {
		const start = sorted[index - 1]!;
		const end = sorted[index]!;

		if (end - start > largestEnd - largestStart) {
			largestStart = start;
			largestEnd = end;
		}
	}

	// The function returns above when all 99 positions are occupied.
	return Math.floor((largestStart + largestEnd) / 2);
}

/**
 * Replaces one arrow position without reordering the rows.
 * A duplicate value leaves the positions unchanged.
 * A value outside 1 through 99 also leaves the positions unchanged.
 */
export function moveArrowPosition(
	positions: readonly number[],
	index: number,
	position: number,
): number[] {
	if (
		!Number.isInteger(position) ||
		position < 1 ||
		position > 99 ||
		positions.some((candidate, candidateIndex) =>
			candidateIndex === index ? false : candidate === position,
		)
	) {
		return [...positions];
	}

	return positions.map((candidate, candidateIndex) =>
		candidateIndex === index ? position : candidate,
	);
}

/** Removes one arrow without reordering the remaining arrows. */
export function removeArrowPosition(positions: readonly number[], index: number): number[] {
	return positions.filter((_, candidateIndex) => candidateIndex !== index);
}

/**
 * Returns the point and direction at a percentage of an orthogonal SVG path.
 * The path may contain M and L commands.
 * A point at a bend uses the preceding segment.
 * A path with zero total length returns undefined.
 */
export function positionOnOrthogonalPath(
	path: string,
	percentage: number,
): OrthogonalPathPosition | undefined {
	const points = readPathPoints(path);
	const segments = points
		.slice(1)
		.map((end, index) => ({ start: points[index]!, end }))
		.map((segment) => ({ ...segment, length: segmentLength(segment.start, segment.end) }))
		.filter((segment) => segment.length > 0);

	const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
	if (totalLength === 0) return;

	const distance = (Math.min(100, Math.max(0, percentage)) / 100) * totalLength;
	let travelled = 0;

	for (const [index, segment] of segments.entries()) {
		const isLast = index === segments.length - 1;

		if (distance <= travelled + segment.length || isLast) {
			const along = Math.min(segment.length, Math.max(0, distance - travelled));
			const direction = {
				x: Math.sign(segment.end.x - segment.start.x) as -1 | 0 | 1,
				y: Math.sign(segment.end.y - segment.start.y) as -1 | 0 | 1,
			};

			return {
				x: segment.start.x + direction.x * along,
				y: segment.start.y + direction.y * along,
				direction,
			};
		}

		travelled += segment.length;
	}
}

function readPathPoints(path: string): { x: number; y: number }[] {
	const points: { x: number; y: number }[] = [];

	for (const match of path.matchAll(/([ML])\s*([\d.-]+)[,\s]+([\d.-]+)/g)) {
		points.push({ x: Number(match[2]), y: Number(match[3]) });
	}

	return points;
}

function segmentLength(start: { x: number; y: number }, end: { x: number; y: number }): number {
	return Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
}
