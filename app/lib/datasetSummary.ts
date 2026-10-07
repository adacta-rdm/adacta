export type OverviewPoint =
	| { time: string; values: (number | null)[] }
	| { x: number; values: (number | null)[] };
export type NumericSummary = {
	count: number;
	missing: number;
	minimum: number | null;
	maximum: number | null;
};
export type DatasetSummary = {
	overview: OverviewPoint[];
	columns: NumericSummary[];
	largestTimeStepMs: number | null;
	nonIncreasingTimeSteps: number;
	largestAxisStep?: number | null;
	nonIncreasingAxisSteps?: number;
};

type Bucket = { points: OverviewPoint[] };

/**
 * Retain endpoints, extrema, and the outer missing-value boundaries of each group.
 * A marker interrupts lines across additional gaps without retaining every row.
 */
export class DatasetSummaryBuilder {
	private readonly columns: NumericSummary[];
	private buckets: Bucket[] = [];
	private pending: Bucket | undefined;
	private pendingCount = 0;
	private groupSize = 1;
	private previousAxis: number | undefined;
	private largestTimeStepMs: number | null = null;
	private nonIncreasingTimeSteps = 0;
	private largestAxisStep: number | null = null;
	private nonIncreasingAxisSteps = 0;

	constructor(
		private readonly numericPositions: boolean[],
		private readonly axisKind: "time" | "numeric" = "time",
	) {
		this.columns = numericPositions.map(() => ({
			count: 0,
			missing: 0,
			minimum: null,
			maximum: null,
		}));
	}

	add(axis: Date | number, values: (number | null)[]) {
		const coordinate = axis instanceof Date ? axis.getTime() : axis;
		if (this.previousAxis !== undefined) {
			const step = coordinate - this.previousAxis;
			if (this.axisKind === "time") {
				if (step <= 0) this.nonIncreasingTimeSteps++;
				else this.largestTimeStepMs = Math.max(this.largestTimeStepMs ?? 0, step);
			} else {
				if (step <= 0) this.nonIncreasingAxisSteps++;
				else this.largestAxisStep = Math.max(this.largestAxisStep ?? 0, step);
			}
		}
		this.previousAxis = coordinate;
		for (const [position, value] of values.entries()) {
			if (!this.numericPositions[position]) continue;
			const summary = this.columns[position]!;
			if (value === null) summary.missing++;
			else {
				summary.count++;
				summary.minimum = Math.min(summary.minimum ?? value, value);
				summary.maximum = Math.max(summary.maximum ?? value, value);
			}
		}
		const point = axis instanceof Date ? { time: axis.toISOString(), values } : { x: axis, values };
		this.pending = this.reduce([...(this.pending?.points ?? []), point]);
		this.pendingCount++;
		if (this.pendingCount === this.groupSize) this.flushPending();
	}

	finish(): DatasetSummary {
		this.flushPending();
		return {
			overview: this.buckets.flatMap((bucket) => bucket.points),
			columns: this.columns,
			largestTimeStepMs: this.largestTimeStepMs,
			nonIncreasingTimeSteps: this.nonIncreasingTimeSteps,
			...(this.axisKind === "numeric"
				? {
						largestAxisStep: this.largestAxisStep,
						nonIncreasingAxisSteps: this.nonIncreasingAxisSteps,
					}
				: {}),
		};
	}

	private flushPending() {
		if (!this.pending) return;
		this.buckets.push(this.pending);
		this.pending = undefined;
		this.pendingCount = 0;
		if (this.buckets.length <= 128) return;
		const compacted: Bucket[] = [];
		for (let index = 0; index < this.buckets.length; index += 2) {
			compacted.push(
				this.reduce(this.buckets.slice(index, index + 2).flatMap((bucket) => bucket.points)),
			);
		}
		this.buckets = compacted;
		this.groupSize *= 2;
	}

	private reduce(points: OverviewPoint[]): Bucket {
		const selected = new Set<number>([0, points.length - 1]);
		for (const [position, numeric] of this.numericPositions.entries()) {
			if (!numeric) continue;
			let firstTransition: number | undefined;
			let lastTransition: number | undefined;
			for (let index = 1; index < points.length; index++) {
				const previous = points[index - 1]!;
				const current = points[index]!;
				if ((previous.values[position] === null) !== (current.values[position] === null)) {
					firstTransition ??= index;
					lastTransition = index;
				}
			}
			for (const transition of [firstTransition, lastTransition]) {
				if (transition === undefined) continue;
				selected.add(transition - 1);
				selected.add(transition);
			}
			let minimum: number | undefined;
			let maximum: number | undefined;
			for (const [index, point] of points.entries()) {
				const value = point.values[position];
				if (value === null) continue;
				if (minimum === undefined || value! < points[minimum]!.values[position]!) minimum = index;
				if (maximum === undefined || value! > points[maximum]!.values[position]!) maximum = index;
			}
			if (minimum !== undefined) selected.add(minimum);
			if (maximum !== undefined) selected.add(maximum);
		}
		const positions = [...selected].sort((a, b) => a - b);
		const retained: OverviewPoint[] = [];
		for (const [index, position] of positions.entries()) {
			if (index > 0) {
				const previousPosition = positions[index - 1]!;
				let markerPosition: number | undefined;
				for (const [column, numeric] of this.numericPositions.entries()) {
					if (
						!numeric ||
						points[previousPosition]!.values[column] === null ||
						points[position]!.values[column] === null
					)
						continue;
					for (let middle = previousPosition + 1; middle < position; middle++) {
						if (points[middle]!.values[column] !== null) continue;
						markerPosition = Math.min(markerPosition ?? middle, middle);
						break;
					}
				}
				if (markerPosition !== undefined) {
					const source = points[markerPosition]!;
					const values = [...source.values];
					// A marker splits every channel's interval. Mask each channel with a gap
					// in that interval so the marker cannot create a false connection.
					for (const [column, numeric] of this.numericPositions.entries()) {
						if (!numeric) continue;
						for (let middle = previousPosition; middle <= position; middle++) {
							if (points[middle]!.values[column] !== null) continue;
							values[column] = null;
							break;
						}
					}
					retained.push({ ...source, values });
				}
			}
			retained.push(points[position]!);
		}
		return { points: retained };
	}
}
