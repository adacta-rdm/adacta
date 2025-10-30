import assert from "assert";

import type { Opaque } from "type-fest";

import { ResourceAttachmentManager } from "../../graphql/context/ResourceAttachmentManager";
import { SubscriptionPublisher } from "../../graphql/context/SubscriptionPublisher";
import { KeyValueDatabaseStorageEngineBackend } from "../../storage/keyValueDatabase/KeyValueDatabaseStorageEngineBackend";
import { EntityLoader } from "../EntityLoader";
import { TaskDispatcher } from "../TaskDispatcher/TaskDispatcher";

import { RepositoryInfo } from "~/apps/repo-server/src/graphql/RepositoryInfo";
import { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import { isNonNullish } from "~/lib/assert/isNonNullish";
import type { IResourceId } from "~/lib/database/Ids";
import { UnitlessMarker } from "~/lib/importWizard/ImportWizardUnit";
import type { TUnit } from "~/lib/importWizard/ImportWizardUnit";
import type { IDownsampledColumn } from "~/lib/interface/IDownsampledColumn";
import type { IDownsampledXColumn } from "~/lib/interface/IDownsampledXColumn";
import { Logger } from "~/lib/logger/Logger";
import { Service } from "~/lib/serviceContainer/ServiceContainer";
import { FileSystemStorageEngine } from "~/lib/storage-engine";

type DownsamplingCacheKey = Opaque<string, "DownsamplingCacheKey">;

export interface IDownsamplingOptions {
	resourceId: IResourceId;

	datapoints: Threshold;

	/**
	 * If true, the requested graph is intended for the "Sparlines" feature
	 * 	- An attempt is made to select a particularly relevant column. Please note that the methodology is very
	 * 		primitive/rudimentary and will be replaced by a user configuration at a later date.)
	 * 	- Results are stored in the L1 cache. Since this mode is often used for lists of resources, it is advantageous
	 * 	if the results are available quickly.
	 */
	keyIndicatorMode?: boolean;

	startX?: number;
	endX?: number;
}

interface IDownsamplingOptionsMerge {
	resourceIds: IResourceId[];

	datapoints: Threshold;
	alignStart?: boolean;
	offsets?: number[];
}

/**
 * Downsampled data is used to represent the downsampled data for a resource.
 * It contains the x-axis and y-axis data.
 */
export interface IDownsampledData {
	type?: "data";
	x: IDownsampledXColumn;
	y: IDownsampledColumn[];
}

/**
 * Permanent error is used to indicate that the downsampling failed and the result is cached.
 * The result is cached as the downsampling task is not expected to succeed at a later point in time.
 */
export interface IDownsampledErrorPermanent {
	type: "permanent_error";
	message: string;
}

/**
 * Temporary error is used to indicate that the downsampling failed.
 * The result is not cached, and the next request will trigger a new downsampling task (which hopefully will succeed).
 */
export interface IDownsampledErrorTemporary {
	type: "temporary_error";
}

export interface IDownsamplingPending {
	type: "downsampling_pending";
}

// Level 1
export type ShortTermCacheResult = LongTermCacheResult | IDownsampledErrorTemporary;

// Level 2
export type LongTermCacheResult =
	| IDownsampledData
	| IDownsampledErrorPermanent
	| IDownsamplingPending;

const THRESHOLDS = [18, 100, 150] as const;
type Threshold = (typeof THRESHOLDS)[number];

/**
 * In-memory pool of already running downsampling tasks used to avoid multiple requests for the same task
 * and to avoid running tasks again which have already failed.
 *
 * Note that this is not a persistent cache, so it will be cleared on server restarts. When the cache is cleared,
 * any previously failed tasks will be retried.
 *
 * This variable is not a member-variable of the class because a new instance of the class is created for every
 * request, effectively clearing the cache on every request.
 */
const taskCache = new Set<DownsamplingCacheKey>();

@Service(
	EntityLoader,
	ResourceAttachmentManager,
	KeyValueDatabaseStorageEngineBackend,
	TaskDispatcher,
	SubscriptionPublisher,
	Logger,
	DrizzleSchema,
	RepositoryInfo
)
export class Downsampling {
	/**
	 * Level 1 cache (fast, ephemeral)
	 * - Caches the downsampled data for each resource (mainly to reduce the load on the L2 cache
	 *   for the resource list with many sparklines)
	 * - Caches temporary errors (if the downsampling fails) to prevent repeated attempts to downsample the
	 *   same data
	 * - Backed by the file system of the apps container (which is ephemeral)
	 * @private
	 */
	private level1Cache: KeyValueDatabaseStorageEngineBackend =
		new KeyValueDatabaseStorageEngineBackend(new FileSystemStorageEngine("/tmp/"));

	/**
	 * Level 2 cache (slightly slower, persistent)
	 * - Backed by the S3 storage engine
	 * @private
	 */
	private level2Cache: KeyValueDatabaseStorageEngineBackend;

	constructor(
		private el: EntityLoader,
		private ram: ResourceAttachmentManager,
		cache: KeyValueDatabaseStorageEngineBackend,
		private td: TaskDispatcher,
		private sp: SubscriptionPublisher,
		private logger: Logger,
		private schema: DrizzleSchema,
		private repoInfo: RepositoryInfo
	) {
		this.level2Cache = cache;
	}

	private static getCacheKey(options: IDownsamplingOptions): DownsamplingCacheKey {
		return `${options.resourceId}_${options.datapoints}_${
			options.keyIndicatorMode ?? "false"
		}` as DownsamplingCacheKey;
	}

	private async requestGraphFromCacheOnly(
		options: IDownsamplingOptions
	): Promise<ShortTermCacheResult | undefined> {
		const cacheKey = Downsampling.getCacheKey(options);

		if (options.keyIndicatorMode) {
			const data = await this.level1Cache.get(cacheKey, "ShortTermCacheResult");

			if (data && data?.data === undefined) {
				this.logger.debug(`Error value cached for ${options.resourceId}`);
			}

			if (data) {
				return data.data;
			}
		}

		const cachedData = await this.level2Cache.get(cacheKey, "LongTermCacheResult");
		if (cachedData?.data.type === "data" || cachedData?.data.type === "permanent_error") {
			this.logger.debug("Downsampling Cache: HIT");

			// Copy data from L2 to L1 cache (for data which is already downsampled)
			if (options.keyIndicatorMode) {
				await this.level1Cache.set(Downsampling.getCacheKey(options), {
					type: "ShortTermCacheResult",
					data: cachedData.data,
				});
			}

			return cachedData.data;
		}
		this.logger.debug("Downsampling Cache: MISS");
		return undefined;
	}

	/**
	 * Returns a promise that resolves to the downsampled data for the given resource if the data has already been
	 * downsampled. If the data has not been downsampled yet, it will be downsampled asynchronously and the function
	 * will return a promise that resolves to undefined. The promise will also resolve to undefined if downsampling
	 * fails.
	 */
	public async requestGraph(options: IDownsamplingOptions): Promise<ShortTermCacheResult> {
		const cached = await this.requestGraphFromCacheOnly(options);
		if (cached?.type === "data" || cached?.type === "permanent_error") {
			this.logger.debug(
				`Returning cached downsampled data for ${options.resourceId}: ${JSON.stringify(cached)}`
			);
			return cached;
		}

		const cacheKey = Downsampling.getCacheKey(options);

		// Check if downsampling is already in progress. We check here in addition to the check already performed in
		// TaskDispatcher to avoid the expensive call to ram.getTabularData().
		if (taskCache.has(cacheKey)) {
			this.logger.info(`Downsampling already in progress for ${options.resourceId}`);
			return { type: "downsampling_pending" }; // Task was already created, return pending
		}

		const logger = this.logger.bind({ ...options });

		this.createDownsamplingTask(options, cacheKey).catch((e) => {
			const message = e instanceof Error ? e.message : "Unknown error";
			logger.error(`Downsampling failed: ${message}`);

			// Note that we don't remove the task in the event of an error. This is intentional, as we prevent
			// downsampling the same data again that will fail anyway.
		});
		return { type: "downsampling_pending" }; // Task is being created, return pending
	}

	private async createDownsamplingTask(
		options: IDownsamplingOptions,
		cacheKey: DownsamplingCacheKey
	) {
		taskCache.add(cacheKey);
		const resource = await this.el.one(this.schema.Resource, options.resourceId);
		const tabularData = await this.ram.getTabularData(resource);
		assert(resource.attachment.type === "TabularData");

		// This check is here to prevent the server from crashing if a resource is empty
		// This should not happen for future resources, but there are already existing resources without
		// any content (with 0 rows).
		if (tabularData.numRows() === 0) {
			this.logger.info(`No rows found for resource ${options.resourceId}`);
			const result = {
				type: "permanent_error",
				message:
					"This resource does not contain any rows. Therefore, it is not possible to display a chart.",
			} as const;
			await this.finishProcessing({ downsamplingOptions: options, cacheKey, result });
			return result;
		}

		// Index of x column
		const x = resource.attachment.columns.findIndex(
			({ independentVariables }) => independentVariables.length === 0
		);
		// Indices of y columns to be downsampled
		const y: number[] = [];

		assert(x > -1);

		if (options.keyIndicatorMode) {
			const indexOfReactorTempColumn = resource.attachment.columns.findIndex(
				({ title }) => title === "Reaktor"
			);

			if (indexOfReactorTempColumn > -1) {
				y.push(indexOfReactorTempColumn);
			} else {
				const lastColumnIndex = resource.attachment.columns.length - 1;
				y.push(x !== lastColumnIndex ? lastColumnIndex : 0);
			}
		} else {
			for (let i = 0; i < resource.attachment.columns.length; i++) {
				const column = resource.attachment.columns[i];
				if (column.independentVariables.length === 0) continue;

				y.push(i);
			}
		}

		if (y.length === 0) {
			this.logger.info(`No y-axis columns found for resource ${options.resourceId}`);
			const result = {
				type: "permanent_error",
				message:
					"This resource does not contain any dependent columns (y-axis). Therefore, it is not possible to display a chart.",
			} as const;
			await this.finishProcessing({ downsamplingOptions: options, cacheKey, result });
			return result;
		}

		const results = await this.td.dispatch("resources/downsample", {
			input: {
				prefix: this.repoInfo.repositoryName,
				path: ResourceAttachmentManager.getPath(resource),
				columns: { x, y },
				numberColumns: tabularData.numColumns(),
				numberRows: tabularData.numRows(),
			},
			threshold: options.datapoints,
		});

		if (!results) {
			return { type: "temporary_error" };
		}

		const { columns } = resource.attachment;

		const xValues = results[0].map((v) => v[0]);

		// Detect if X Axis is descending and reverse order of values in that case
		const swapOrderForDescendingX = xValues[0] > xValues[xValues.length - 1];
		if (swapOrderForDescendingX) {
			xValues.reverse();
		}

		const printUnit = (unit: TUnit) => (unit === UnitlessMarker ? "Unitless" : unit);

		const result: IDownsampledData = {
			x: {
				type: columns[x].type,
				label: columns[x].title,
				unit: printUnit(columns[x].unit),
				values: xValues,
			},
			y: y.map((y, i) => {
				const yValues = results[i].map((v) => v[1]);
				if (swapOrderForDescendingX) {
					yValues.reverse();
				}

				return {
					deviceId: columns[y].deviceId,
					resourceId: options.resourceId,
					label: columns[y].title,
					unit: printUnit(columns[y].unit),
					values: yValues,
				};
			}),
		};

		this.logger.info(`Downsampling tasks finished. Writing into cache`);

		await this.finishProcessing({ downsamplingOptions: options, cacheKey, result });
	}

	/**
	 * This function is called when a result is ready (i.e. downsample data or error).
	 * It writes the result to the cache and notifies the client about the result.
	 */
	private async finishProcessing({
		downsamplingOptions: options,
		cacheKey,
		result,
	}: {
		downsamplingOptions: IDownsamplingOptions;
		cacheKey: DownsamplingCacheKey;
		result: LongTermCacheResult;
	}) {
		if (options.keyIndicatorMode) {
			await this.level1Cache.set(cacheKey, {
				type: "ShortTermCacheResult",
				data: { type: "data", ...result },
			});
		}

		await this.level2Cache.set(cacheKey, {
			type: "LongTermCacheResult",
			data: { type: "data", ...result },
		});

		this.sp.publish("downsampleDataBecameReady", {
			resourceId: options.resourceId,
			dataPoints: options.datapoints,
			singleColumn: options.keyIndicatorMode,
			resource: { id: options.resourceId },
		});

		// Remove the task from cache once we've successfully downsampled the data to avoid memory leaks.
		taskCache.delete(cacheKey);
	}

	public async requestGraphMerged(
		options: IDownsamplingOptionsMerge
	): Promise<{ x: IDownsampledXColumn; y: IDownsampledColumn[] }[]> {
		const { resourceIds, alignStart, offsets } = options;

		if (resourceIds.length === 0) {
			return [];
		}

		const downsampled = (
			await Promise.all(
				resourceIds.map((id) =>
					this.requestGraph({
						resourceId: id,
						datapoints: options.datapoints,
					})
				)
			)
		)
			.filter(isNonNullish)
			.filter((e): e is IDownsampledData => e.type === "data");

		// It is possible that all requested resources aren't downsampled yet
		// In this case we return an empty array
		if (downsampled.length === 0) {
			return [];
		}

		// Find x axes which aren't of type datetime
		const nonDatePairs = downsampled.filter((d) => d.x.type !== "datetime");

		// Find x axes of type datetime
		let datePairs = downsampled.filter((d) => d.x.type === "datetime");

		if (alignStart || (offsets !== undefined && offsets.length > 0)) {
			datePairs = datePairs.map((d, index) => {
				const alignmentOffset = alignStart ? d.x.values[0] : 0;
				const userOffset = offsets !== undefined ? offsets[index] ?? 0 : 0;

				return {
					...d,
					x: {
						...d.x,
						values: d.x.values.map((v) => {
							return v - alignmentOffset + userOffset;
						}),
					},
				};
			});
		}

		// Merge X axis
		const mergedXAxis = [...new Set(datePairs.flatMap((d) => d.x.values).sort((a, b) => a - b))];

		// Update Y axes to match the newly created (merged) X axis
		const modifiedYAxes: IDownsampledColumn[][] = [];
		for (const datePair of datePairs) {
			// Keep all information about the axis but get rid of the values
			const yAxis: IDownsampledColumn[] = datePair.y.map((d) => ({ ...d, values: [] }));
			let temp: IDownsampledColumn[] = [];

			// Add the y-axis values for each x value
			// Either the axis has a value for the given x value or undefined is added
			for (const x of mergedXAxis) {
				const xIndex = datePair.x.values.findIndex((xValue) => xValue === x);
				temp = yAxis.map((y, yIndex) => {
					y.values.push(xIndex !== -1 ? datePair.y[yIndex].values[xIndex] : undefined);
					return y;
				});
			}

			modifiedYAxes.push(temp);
		}

		const mergedPair: { x: IDownsampledXColumn; y: IDownsampledColumn[] } = {
			x: { ...datePairs[0].x, values: mergedXAxis },
			y: modifiedYAxes.flat(),
		};

		return [mergedPair, ...nonDatePairs];
	}
}
