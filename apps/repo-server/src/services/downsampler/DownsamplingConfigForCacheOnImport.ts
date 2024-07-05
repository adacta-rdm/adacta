import type { IDownsamplingOptions } from "./Downsampling";

/**
 * Information about how to downsample the resources for the cache when they are imported
 */
export const DownsamplingConfigForCacheOnImport: Omit<IDownsamplingOptions, "resourceId"> = {
	datapoints: 18,
	keyIndicatorMode: true,
};
