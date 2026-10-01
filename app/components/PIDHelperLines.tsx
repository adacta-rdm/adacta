import { useViewport, type XYPosition } from "@xyflow/react";

// Fractional SVG footprints, such as the 29.449px pressurized vessel, can
// place a measured center just beyond five pixels from a round symbol.
export const PID_HELPER_LINE_SNAP_DISTANCE = 6;
const PID_HELPER_ALIGNMENT_EPSILON = 0.5;

export interface PIDHelperAnchor extends XYPosition {
	nodeId: string;
}

export interface PIDHelperMatch {
	moving: PIDHelperAnchor;
	stationary: PIDHelperAnchor;
	alignedStationary: PIDHelperAnchor[];
}

export interface PIDHelperLines {
	horizontal?: PIDHelperMatch;
	vertical?: PIDHelperMatch;
}

export interface PIDAnchorAlignment {
	delta: XYPosition;
	lines: PIDHelperLines;
}

/**
 * Returns the nearest symbol-center alignment on each axis.
 */
export function getPIDAnchorAlignment(
	movingAnchors: readonly PIDHelperAnchor[],
	stationaryAnchors: readonly PIDHelperAnchor[],
	snapDistance: number,
): PIDAnchorAlignment {
	type Candidate = {
		distance: number;
		delta: number;
		coordinate: number;
		moving: PIDHelperAnchor;
		stationary: PIDHelperAnchor;
	};
	let horizontal: Candidate | undefined;
	let vertical: Candidate | undefined;

	for (const moving of movingAnchors) {
		for (const stationary of stationaryAnchors) {
			const xDelta = stationary.x - moving.x;
			const xDistance = Math.abs(xDelta);

			if (xDistance <= snapDistance && (!vertical || xDistance < vertical.distance)) {
				vertical = {
					distance: xDistance,
					delta: xDelta,
					coordinate: stationary.x,
					moving,
					stationary,
				};
			}

			const yDelta = stationary.y - moving.y;
			const yDistance = Math.abs(yDelta);

			if (yDistance <= snapDistance && (!horizontal || yDistance < horizontal.distance)) {
				horizontal = {
					distance: yDistance,
					delta: yDelta,
					coordinate: stationary.y,
					moving,
					stationary,
				};
			}
		}
	}

	const delta = { x: vertical?.delta ?? 0, y: horizontal?.delta ?? 0 };
	const match = (candidate: Candidate, alignedStationary: PIDHelperAnchor[]): PIDHelperMatch => ({
		moving: {
			...candidate.moving,
			x: candidate.moving.x + delta.x,
			y: candidate.moving.y + delta.y,
		},
		stationary: candidate.stationary,
		alignedStationary,
	});
	const horizontalMatch =
		horizontal === undefined
			? undefined
			: match(
					horizontal,
					stationaryAnchors.filter(
						(anchor) => Math.abs(anchor.y - horizontal.coordinate) <= PID_HELPER_ALIGNMENT_EPSILON,
					),
				);
	const verticalMatch =
		vertical === undefined
			? undefined
			: match(
					vertical,
					stationaryAnchors.filter(
						(anchor) => Math.abs(anchor.x - vertical.coordinate) <= PID_HELPER_ALIGNMENT_EPSILON,
					),
				);

	return {
		delta,
		lines: {
			horizontal: horizontalMatch,
			vertical: verticalMatch,
		},
	};
}

/** Draws active symbol-center alignments across the visible canvas. */
export function PIDHelperLinesRenderer({ lines }: { lines: PIDHelperLines }) {
	const viewport = useViewport();
	const horizontal = lines.horizontal
		? {
				line: lines.horizontal.stationary.y * viewport.zoom + viewport.y,
				moving: toScreen(lines.horizontal.moving, viewport),
				stationary: lines.horizontal.alignedStationary.map((anchor) => toScreen(anchor, viewport)),
			}
		: undefined;
	const vertical = lines.vertical
		? {
				line: lines.vertical.stationary.x * viewport.zoom + viewport.x,
				moving: toScreen(lines.vertical.moving, viewport),
				stationary: lines.vertical.alignedStationary.map((anchor) => toScreen(anchor, viewport)),
			}
		: undefined;

	if (horizontal === undefined && vertical === undefined) return null;

	return (
		<svg
			aria-hidden="true"
			className="pid-helper-lines pointer-events-none absolute inset-0 z-[4] size-full overflow-hidden"
		>
			{horizontal === undefined ? null : (
				<>
					<line
						x1="0"
						y1={horizontal.line}
						x2="100%"
						y2={horizontal.line}
						className="stroke-accent opacity-40"
						strokeWidth="1"
					/>
					{horizontal.stationary.map((point) => (
						<line
							key={`horizontal-${point.nodeId}`}
							x1={horizontal.moving.x}
							y1={horizontal.line}
							x2={point.x}
							y2={horizontal.line}
							className="stroke-accent"
							strokeWidth="2"
						/>
					))}
				</>
			)}

			{vertical === undefined ? null : (
				<>
					<line
						x1={vertical.line}
						y1="0"
						x2={vertical.line}
						y2="100%"
						className="stroke-accent opacity-40"
						strokeWidth="1"
					/>
					{vertical.stationary.map((point) => (
						<line
							key={`vertical-${point.nodeId}`}
							x1={vertical.line}
							y1={vertical.moving.y}
							x2={vertical.line}
							y2={point.y}
							className="stroke-accent"
							strokeWidth="2"
						/>
					))}
				</>
			)}

			{horizontal === undefined ? null : <CenterMarker point={horizontal.moving} />}
			{horizontal?.stationary.map((point) => (
				<CenterMarker key={`horizontal-${point.nodeId}`} point={point} />
			))}
			{vertical === undefined ? null : <CenterMarker point={vertical.moving} />}
			{vertical?.stationary.map((point) => (
				<CenterMarker key={`vertical-${point.nodeId}`} point={point} />
			))}
		</svg>
	);
}

function toScreen(anchor: PIDHelperAnchor, viewport: { x: number; y: number; zoom: number }) {
	return {
		nodeId: anchor.nodeId,
		x: anchor.x * viewport.zoom + viewport.x,
		y: anchor.y * viewport.zoom + viewport.y,
	};
}

function CenterMarker({ point }: { point: { x: number; y: number } }) {
	return (
		<circle
			cx={point.x}
			cy={point.y}
			r="3"
			className="fill-surface stroke-accent"
			strokeWidth="1.5"
		/>
	);
}
