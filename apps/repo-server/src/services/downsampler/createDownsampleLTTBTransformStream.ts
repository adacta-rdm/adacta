import type { Duplex } from "@omegadot/streams";
import { createDuplex } from "@omegadot/streams";

import type { IOptions, Point } from "./downsampleLTTBRowMajorAsync";

/**
 * Largest-Triangle-Three-Buckets
 */
export function createDownsampleLTTBTransformStream(
	dataLength: number,
	threshold: number,
	options: IOptions = {}
): Duplex<number[], Point> {
	return createDuplex({ asyncGen: createGenerator(dataLength, threshold, options) });
}

function createGenerator(dataLength: number, threshold: number, options: IOptions = {}) {
	return async function* downsampleLTTB(source: AsyncIterable<readonly number[]>) {
		const iterator = source[Symbol.asyncIterator]();

		const x = options.x ?? 0;
		const y = options.y ?? 1;

		async function d(): Promise<Point> {
			const result = (await iterator.next()) as { value?: readonly number[] };

			if (!result.value) {
				throw new Error("downsampleLTTBRowMajorAsync: Unexpected end of data");
			}

			const p: Point = [result.value[x], result.value[y]];
			if (typeof p[0] !== "number" || typeof p[1] !== "number") {
				throw new Error("downsampleLTTBRowMajorAsync: Inconsistent data");
			}

			return p;
		}

		// Skip downsampling when the caller requests more points than there are in the dataset
		if (threshold >= dataLength || threshold === 0) {
			for (let i = 0; i < dataLength; i++) {
				yield await d();
			}
			return;
		}

		// Bucket size. Leave room for start and end data points
		const every = (dataLength - 2) / (threshold - 2);

		function bucketLength(i: number) {
			const a = Math.floor(i * every) + 1;
			let b = Math.floor((i + 1) * every) + 1;
			b = b < dataLength ? b : dataLength;
			return b - a;
		}

		let pointA = await d();
		let bucketB: Point[] = [];
		let bucketC: Point[] = [];

		// The downsampled data always contains the first point
		yield pointA;

		for (let i = 0; i < threshold - 2; i++) {
			// Data population step
			// Populate only the current and next buckets with data points

			bucketB = bucketC;
			bucketC = [];

			if (bucketB.length === 0) {
				const len = bucketLength(i);
				for (let j = 0; j < len; j++) bucketB.push(await d());
			}

			{
				const len = bucketLength(i + 1);
				for (let j = 0; j < len; j++) bucketC.push(await d());
			}

			// Calculate point average for next bucket (containing c)
			const avg: Point = [0, 0];

			for (const point of bucketC) {
				avg[0] += point[0];
				avg[1] += point[1];
			}

			avg[0] /= bucketC.length;
			avg[1] /= bucketC.length;

			let maxAreaPoint!: Point; // The point with the largest triangle area
			let maxArea = -Infinity;

			for (const point of bucketB) {
				const area =
					Math.abs(
						(pointA[0] - avg[0]) * (point[1] - pointA[1]) -
							(pointA[0] - point[0]) * (avg[1] - pointA[1])
					) * 0.5;

				if (area > maxArea) {
					maxArea = area;
					maxAreaPoint = point;
				}
			}
			// Pick the point from the bucket with the largest area
			yield maxAreaPoint;
			pointA = maxAreaPoint;
		}

		// The downsampled data always contains the first point
		yield bucketC[0];
	};
}
