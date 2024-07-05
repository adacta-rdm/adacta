import type { IDownsampledColumn } from "~/lib/interface/IDownsampledColumn";

export interface IDownsampledXColumn extends IDownsampledColumn {
	type: "datetime" | "number";
	values: number[];
}
