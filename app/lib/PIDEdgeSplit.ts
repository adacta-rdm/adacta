import type { PIDEdgeData } from "~/app/lib/PIDEditorGraph.ts";

/**
 * Returns the nearest candidate when no second line is nearly as close.
 */
export function unambiguousSplitCandidate<T extends { distance: number }>(
	candidates: readonly T[],
	minimumDifference: number,
): T | undefined {
	const ordered = [...candidates].sort((left, right) => left.distance - right.distance);
	if (ordered.length > 1 && ordered[1]!.distance - ordered[0]!.distance <= minimumDifference)
		return undefined;

	return ordered[0];
}

/**
 * Returns the data for the two parts of a connection split at one point.
 * The fraction measures distance along the drawn path from source to target.
 */
export function splitPIDEdgeData(
	data: PIDEdgeData,
	fraction: number,
): [PIDEdgeData, PIDEdgeData] | undefined {
	if (fraction <= 0 || fraction >= 1) return undefined;

	const beforeArrows: number[] = [];
	const afterArrows: number[] = [];

	for (const position of data.arrowPositions) {
		const before = position / 100 < fraction;
		const fractionOnPart = before
			? position / 100 / fraction
			: (position / 100 - fraction) / (1 - fraction);
		const placed = placeArrow(before ? beforeArrows : afterArrows, fractionOnPart * 100);
		if (placed === undefined) return undefined;

		(before ? beforeArrows : afterArrows).push(placed);
	}

	const beforeLength = data.length ? { ...data.length, value: data.length.value * fraction } : null;
	const afterLength = data.length
		? { ...data.length, value: data.length.value - beforeLength!.value }
		: null;

	return [
		{ ...data, endArrow: false, arrowPositions: beforeArrows, length: beforeLength },
		{ ...data, arrowPositions: afterArrows, length: afterLength },
	];
}

function placeArrow(occupied: readonly number[], desired: number): number | undefined {
	const center = Math.max(1, Math.min(99, Math.round(desired)));

	for (let distance = 0; distance < 99; distance++) {
		for (const position of [center - distance, center + distance]) {
			if (position >= 1 && position <= 99 && !occupied.includes(position)) return position;
		}
	}
}
