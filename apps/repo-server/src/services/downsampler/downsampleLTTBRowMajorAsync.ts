export type Point = [number, number];
export interface IOptions {
	/**
	 * Index of the column holding the x-values. Defaults to 0.
	 */
	x?: number;

	/**
	 * Index of the column holding the y-values. Defaults to 1.
	 */
	y?: number;
}

/**
 * Async version of the Largest-Triangle-Three-Buckets (LTTB) decimation algorithm.
 *
 * See https://skemman.is/bitstream/1946/15343/3/SS_MSthesis.pdf
 * See https://github.com/sveinn-steinarsson/flot-downsample
 *
 * @param iter
 * @param dataLength - The number of rows in the data.
 * @param threshold Number of output values
 * @param options - The column indices to downsample. Defaults to { x: 0, y: 1 }.
 * @returns A [x, y][] array of length `threshold`
 */
export async function downsampleLTTBRowMajorAsync(
	iter: AsyncIterable<readonly number[]>,
	dataLength: number,
	threshold: number,
	options?: IOptions
): Promise<Point[]>;

/**
 * Async version of the Largest-Triangle-Three-Buckets (LTTB) decimation algorithm.
 *
 * See https://skemman.is/bitstream/1946/15343/3/SS_MSthesis.pdf
 * See https://github.com/sveinn-steinarsson/flot-downsample
 *
 * @param iter
 * @param dataLength - The number of rows in the data.
 * @param threshold Number of output values
 * @param options - An array of column indices to downsample.
 * @returns A two-dimensional array of [x, y] pairs. Each inner array corresponds to a specific column index specified in options and contains threshold number of [x, y] pairs
 */
export async function downsampleLTTBRowMajorAsync(
	iter: AsyncIterable<readonly number[]>,
	dataLength: number,
	threshold: number,
	options: Required<IOptions>[]
): Promise<Point[][]>;

export async function downsampleLTTBRowMajorAsync(
	iter: AsyncIterable<readonly number[]>,
	dataLength: number,
	threshold: number,
	options: IOptions | Required<IOptions>[] = {}
): Promise<Point[] | Point[][]> {
	if (threshold <= 2) {
		throw new Error("threshold must be greater than 2");
	}

	// Normalize the options to an array of { x, y } objects that can be iterated over
	const colSelection = (
		Array.isArray(options) ? options : [{ x: options.x ?? 0, y: options.y ?? 1 }]
	).map(({ x, y }, index) => ({
		x,
		y,
		// Convenience reference to the correct position in the output array
		get output() {
			return output[index];
		},
	}));

	if (colSelection.length === 0) throw new Error("options must not be empty");

	// Initialize the inner arrays of the output so we can safely just call `push` when adding items.
	// The outer array (i.e. `output`) has the same length `options`.
	const output: Point[][] = colSelection.map(() => []);

	const iterator = iter[Symbol.asyncIterator]();

	let rowLength = -1;
	async function d(): Promise<number[]> {
		const result = (await iterator.next()) as { value?: readonly number[] };

		if (!result.value) {
			throw new Error("downsampleLTTBRowMajorAsync: Unexpected end of data");
		}

		if (rowLength === -1) {
			rowLength = result.value.length;
		} else if (rowLength !== result.value.length) {
			throw new Error("downsampleLTTBRowMajorAsync: Inconsistent data");
		}

		return result.value as number[];
	}

	function bucketLength(i: number) {
		// Bucket size. Leave room for start and end data points
		const every = (dataLength - 2) / (threshold - 2);
		const a = Math.floor(i * every) + 1;
		let b = Math.floor((i + 1) * every) + 1;
		b = b < dataLength ? b : dataLength;
		return b - a;
	}

	async function getRows(count: number) {
		const p = [];
		for (let i = 0; i < count; ++i) p.push(await d());
		return Promise.all(p);
	}

	// Skip downsampling when the caller requests more points than there are in the dataset
	if (threshold >= dataLength) {
		for (let i = 0; i < dataLength; i++) {
			const row = await d();

			for (const { x, y, output } of colSelection) {
				output.push([row[x], row[y]]);
			}
		}

		return Array.isArray(options) ? output : output[0];
	}

	const row = await d();
	let bucketB: number[][] = [];
	let bucketC: number[][] = [];

	// Initialize the output with the first point
	for (const { x, y, output } of colSelection) {
		output.push([row[x], row[y]]);
	}

	// Populate the first bucket with rows.
	// Note that we are in fact populating bucket C, which is assigned to bucket B in the main loop.
	bucketC = await getRows(bucketLength(0));

	// Main loop: Iterate over the buckets
	for (let i = 1; i < threshold - 1; i++) {
		// Re-assign buckets and populate the next bucket with data points
		bucketB = bucketC;
		bucketC = [];

		bucketC = await getRows(bucketLength(i));

		// Calculate point average for each column in bucket C
		const avgC: number[] = new Array<number>(rowLength).fill(0);
		for (const row of bucketC) {
			for (let i = 0; i < row.length; i++) avgC[i] += row[i];
		}
		for (let i = 0; i < avgC.length; i++) avgC[i] /= bucketC.length;

		for (const { x, y, output } of colSelection) {
			const pointA = output[output.length - 1];
			let maxAreaPoint!: Point; // The point with the largest triangle area
			let maxArea = -Infinity;

			for (const row of bucketB) {
				const area =
					Math.abs(
						(pointA[0] - avgC[x]) * (row[y] - pointA[1]) -
							(pointA[0] - row[x]) * (avgC[y] - pointA[1])
					) * 0.5;

				if (area > maxArea) {
					maxArea = area;
					maxAreaPoint = [row[x], row[y]];
				}
			}
			// Pick the point from the bucket with the largest area
			output.push(maxAreaPoint);
		}
	}

	// The downsampled data always contains the last point
	for (const { x, y, output } of colSelection) {
		output.push([bucketC[bucketC.length - 1][x], bucketC[bucketC.length - 1][y]]);
	}

	// Return a single array of points, i.e. Point[], if only one column was requested.
	return Array.isArray(options) ? output : output[0];
}
