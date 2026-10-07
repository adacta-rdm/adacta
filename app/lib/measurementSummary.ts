export type OverviewPoint = { time: string; values: (number | null)[] };
export type NumericSummary = {
	count: number;
	missing: number;
	minimum: number | null;
	maximum: number | null;
};
export type MeasurementSummary = {
	overview: OverviewPoint[];
	columns: NumericSummary[];
	largestTimeStepMs: number | null;
	nonIncreasingTimeSteps: number;
};

type Bucket = { points: OverviewPoint[] };

/**
 * Retain first, last, and extrema rows from each bounded group.
 */
export class MeasurementSummaryBuilder {
	private readonly columns: NumericSummary[];
	private buckets: Bucket[] = [];
	private pending: Bucket | undefined;
	private pendingCount = 0;
	private groupSize = 1;
	private previousTime: number | undefined;
	private largestTimeStepMs: number | null = null;
	private nonIncreasingTimeSteps = 0;

	constructor(private readonly numericPositions: boolean[]) {
		this.columns = numericPositions.map(() => ({
			count: 0,
			missing: 0,
			minimum: null,
			maximum: null,
		}));
	}

	add(time: Date, values: (number | null)[]) {
		const milliseconds = time.getTime();
		if (this.previousTime !== undefined) {
			const step = milliseconds - this.previousTime;
			if (step <= 0) this.nonIncreasingTimeSteps++;
			else this.largestTimeStepMs = Math.max(this.largestTimeStepMs ?? 0, step);
		}
		this.previousTime = milliseconds;
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
		const point = { time: time.toISOString(), values };
		this.pending = this.reduce([...(this.pending?.points ?? []), point]);
		this.pendingCount++;
		if (this.pendingCount === this.groupSize) this.flushPending();
	}

	finish(): MeasurementSummary {
		this.flushPending();
		return {
			overview: this.buckets.flatMap((bucket) => bucket.points),
			columns: this.columns,
			largestTimeStepMs: this.largestTimeStepMs,
			nonIncreasingTimeSteps: this.nonIncreasingTimeSteps,
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
		const selected = new Set<OverviewPoint>([points[0]!, points.at(-1)!]);
		for (const [position, numeric] of this.numericPositions.entries()) {
			if (!numeric) continue;
			const valid = points.filter((point) => point.values[position] !== null);
			if (valid.length === 0) continue;
			selected.add(valid.reduce((a, b) => (a.values[position]! <= b.values[position]! ? a : b)));
			selected.add(valid.reduce((a, b) => (a.values[position]! >= b.values[position]! ? a : b)));
		}
		return { points: points.filter((point) => selected.has(point)) };
	}
}
