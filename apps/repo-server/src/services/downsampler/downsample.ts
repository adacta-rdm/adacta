import type { Point } from "./downsampleLTTBRowMajorAsync";
import { downsampleLTTBRowMajorAsync } from "./downsampleLTTBRowMajorAsync";
import type { IDownsamplingTaskArgs } from "../../../interface/IDownsamplingTaskArgs";

import type { Logger } from "~/lib/logger/Logger";
import type { StorageEngine } from "~/lib/storage-engine";
import { TabularData } from "~/lib/tabular-data";

/**
 * Produces downsampled data from a given TabularData input.
 *
 * Note that the number of columns in the output tables will likely differ from those of the input file. This is because
 * a new set of x values is generated for every y column. The number of columns in the output TabularData is twice the
 * number of y-columns in the input.
 *
 * For example, from a TabularData resource with a single x-column that is common to the remaining 3 y-columns,
 * ┌─────┬─────┬─────┬─────┐
 * │x    │y1   │y2   │y3   │
 * ├─────┼─────┼─────┼─────┤
 * │     │     │     │     │ 1
 * │     │     │     │     │
 * │     │     │     │     │ ...
 * │     │     │     │     │
 * │     │     │     │     │ N (`input.numberRows`)
 * └─────┴─────┴─────┴─────┘
 *
 * the function will create TabularData files with the following structure:
 * ┌─────┬─────┬─────┬─────┬─────┬─────┐
 * │x1   │y1   │x2   │y2   │x3   │y3   │
 * ├─────┼─────┼─────┼─────┼─────┼─────┤
 * │     │     │     │     │     │     │ 1
 * │     │     │     │     │     │     │ ...
 * │     │     │     │     │     │     │ N (`output.threshold`)
 * └─────┴─────┴─────┴─────┴─────┴─────┘
 *
 * Every downsampled TabularData will have the same columns, but a different number of rows (matching the entries under
 * `output.threshold`).
 */
export async function downsample(
	ctx: { sto: StorageEngine; logger: Logger },
	args: IDownsamplingTaskArgs
): Promise<Point[][]> {
	const { input, threshold } = args;

	ctx.logger.info(
		`Downsampling input ${input.path} with ${input.numberRows} data points to ${threshold} data points.`
	);

	const stream = TabularData.createReadStream(ctx.sto, input.path, input.numberColumns);

	return downsampleLTTBRowMajorAsync(
		stream,
		input.numberRows,
		threshold,
		input.columns.y.map((y) => ({ x: input.columns.x, y }))
	);
}
