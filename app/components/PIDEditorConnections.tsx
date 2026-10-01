import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

import type { PIDEdgeKind } from "~/app/lib/PID.ts";
import { positionOnOrthogonalPath, defaultEndArrow } from "~/app/lib/PIDEdgeArrows.ts";
import { edgeKind, type PIDEdge } from "~/app/lib/PIDEditorGraph.ts";
import { parallelLines } from "~/lib/parallel-lines/ParallelLines.ts";

const LINE_COLOR = "var(--adacta-color-foreground)";
const SELECTED_COLOR = "var(--adacta-color-accent)";
const NOTE_COLOR = "var(--adacta-color-foreground-muted)";

/** The width is slightly thinner than the symbol strokes, keeping symbols visually dominant. */
const LINE_WIDTH = 1;

/**
 * Draws one connection between two symbols according to its kind.
 * A pipe is a single line. A jacketed pipe has two side lines around its
 * process line. A traced pipe has a solid process line and a dash-dot tracer.
 * Electrical wiring is dashed. A caption uses a muted solid line.
 */
export function PIDConnection({
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	data,
	selected,
}: EdgeProps<PIDEdge>) {
	// A P&ID uses right angles, so the corner radius is zero. The ends are
	// rounded to whole pixels. Two ports that sit a fraction of a pixel apart
	// would otherwise produce a short step in a line that should be straight.
	const [route] = getSmoothStepPath({
		sourceX: Math.round(sourceX),
		sourceY: Math.round(sourceY),
		targetX: Math.round(targetX),
		targetY: Math.round(targetY),
		sourcePosition,
		targetPosition,
		borderRadius: 0,
	});

	const kind = edgeKind({ data });
	// Selecting a connection changes its color. The width stays the same, so
	// the drawing does not shift as the selection moves.
	const color = selected ? SELECTED_COLOR : kind === "caption" ? NOTE_COLOR : LINE_COLOR;
	// A heavier line is drawn thicker, and its parallel lines move apart with
	// it, so the whole connection grows rather than only its centre.
	const lineWidth = LINE_WIDTH * (data?.weight ?? 1);
	const endArrow = data?.endArrow ?? defaultEndArrow(kind);
	const arrowPositions = data?.arrowPositions ?? [];
	const drawing = connectionDrawing(route, kind, lineWidth, endArrow);

	return (
		<>
			{drawing.background ? <Crossing shape={drawing.background} /> : null}
			{drawing.lines.map((line, index) => (
				<BaseEdge
					key={index}
					path={line.path}
					style={{ stroke: color, strokeWidth: lineWidth, strokeDasharray: line.dashes }}
				/>
			))}
			{[...arrowPositions, ...(endArrow ? [100] : [])].map((position, index) => (
				<ConnectionArrow
					key={`${position}-${index}`}
					route={route}
					position={position}
					kind={kind}
					lineWidth={lineWidth}
					color={color}
				/>
			))}
		</>
	);
}

interface ConnectionDrawing {
	/** The shape filled behind the connection where it has one. */
	background?: string;
	/** The lines to stroke, in the order they are drawn. */
	lines: { path: string; dashes?: string }[];
}

/**
 * Returns the lines that make up one connection.
 *
 * The diagram and the sample shown in the palette are both built from this, so
 * the two cannot drift apart.
 *
 * A caption and electrical wiring each use one line. A pipe is a center line.
 * A jacketed pipe adds a line on each side of the center. These side lines stop
 * before the symbol. A traced pipe uses a solid process line and a dash-dot
 * tracer beside it.
 *
 * Pass withArrow as false where no arrow is drawn. The jacket then needs only
 * its usual gap, rather than one wide enough to clear an arrow.
 */
export function connectionDrawing(
	route: string,
	kind: PIDEdgeKind,
	lineWidth: number,
	withArrow = true,
): ConnectionDrawing {
	if (kind === "caption") return { lines: [{ path: route }] };
	if (kind === "electrical") {
		return { lines: [{ path: route, dashes: electricalDashes(lineWidth) }] };
	}
	if (kind === "pipe") {
		const lines = parallelLines(route, {
			spacing: 2 + lineWidth,
			lineWidth,
			shortenForArrow: withArrow,
		});
		return { background: lines.centerBackground, lines: [{ path: lines.center }] };
	}
	if (kind === "jacketed") {
		const spacing = 2 + lineWidth;
		// The arrow is taller than the jacket is wide, so a jacket ending closer
		// than one spacing behind it appears to run into it.
		const outerEndGap = withArrow ? lineWidth + arrowLength(lineWidth) + spacing : spacing;
		const lines = parallelLines(route, {
			spacing,
			lineWidth,
			outerEndGap,
			shortenForArrow: withArrow,
		});
		return {
			background: lines.fullBackground,
			lines: [{ path: lines.left + lines.right }, { path: lines.center }],
		};
	}
	// Both lines reach the symbol, because one of them is the pipe. Neither
	// carries an arrow: they run beside the centre, so an arrow on one of them
	// would point from the side.
	const lines = parallelLines(route, { spacing: 1 + lineWidth, lineWidth, outerEndGap: 0 });
	return {
		background: lines.fullBackground,
		lines: [{ path: lines.right }, { path: lines.left, dashes: tracerDashes(lineWidth) }],
	};
}

function ConnectionArrow({
	route,
	position,
	kind,
	lineWidth,
	color,
}: {
	route: string;
	position: number;
	kind: PIDEdgeKind;
	lineWidth: number;
	color: string;
}) {
	const placed = positionOnOrthogonalPath(route, position);
	if (!placed) return null;
	let { x, y } = placed;
	const { direction } = placed;
	if (kind === "traced") {
		// A traced connection places the solid process stroke beside the route.
		// Its arrows use the same offset as that stroke.
		const spacing = 1 + lineWidth;
		if (direction.x !== 0) y -= direction.x * spacing;
		else x += direction.y * spacing;
	}
	// React Flow uses the points -5,-4 0,0 -5,4 for a closed arrow. The marker
	// has a 20-unit view box and a rendered width of 12.5 units. These factors
	// give intermediate and endpoint arrows the same dimensions.
	const depth = 5 * (12.5 / 20) * lineWidth;
	const halfHeight = 4 * (12.5 / 20) * lineWidth;
	const back = { x: x - direction.x * depth, y: y - direction.y * depth };
	const across = { x: -direction.y * halfHeight, y: direction.x * halfHeight };
	const points = [
		`${back.x + across.x},${back.y + across.y}`,
		`${x},${y}`,
		`${back.x - across.x},${back.y - across.y}`,
	].join(" ");
	return (
		<polygon
			points={points}
			fill={color}
			stroke={color}
			strokeWidth={lineWidth}
			strokeLinejoin="round"
			style={{ pointerEvents: "none" }}
		/>
	);
}

/** Draws a short piece of one connection kind for the selector in the palette. */
export function PIDConnectionSample({ kind }: { kind: PIDEdgeKind }) {
	const width = 40;
	const height = 12;
	const middle = height / 2;
	const drawing = connectionDrawing(
		`M 1 ${middle} L ${width - 1} ${middle}`,
		kind,
		LINE_WIDTH,
		false,
	);
	return (
		<svg viewBox={`0 0 ${width} ${height}`} className="h-3 w-10 shrink-0" aria-hidden="true">
			{drawing.lines.map((line, index) => (
				<path
					key={index}
					d={line.path}
					fill="none"
					stroke={kind === "caption" ? NOTE_COLOR : "currentColor"}
					strokeWidth={LINE_WIDTH}
					strokeDasharray={line.dashes}
				/>
			))}
		</svg>
	);
}

function Crossing({ shape }: { shape: string }) {
	// A line drawn underneath is hidden where the shape covers it. A reader can
	// therefore tell which of two crossing lines passes over the other.
	// React Flow styles the paths inside an edge. Without an explicit "none" the
	// shape is outlined as well as filled.
	return (
		<path
			d={shape}
			fill="var(--adacta-color-canvas)"
			stroke="none"
			style={{ pointerEvents: "none" }}
		/>
	);
}

function arrowLength(lineWidth: number): number {
	// React Flow's marker is 12.5 units wide in a 20-unit view box and reaches
	// five units back from the tip.
	return 5 * (12.5 / 20) * lineWidth;
}

function tracerDashes(lineWidth: number): string {
	// The pattern repeats a long dash and a short one, scaled to line width.
	return [5, 2, 1, 1].map((part) => part * lineWidth).join(" ");
}

/** Returns the dash pattern for an electrical connection. */
function electricalDashes(lineWidth: number): string {
	return [5, 3].map((part) => part * lineWidth).join(" ");
}
