import type { IDeviceId, IResourceId } from "~/lib/database/Ids";

export interface IDownsampledColumn {
	label: string;
	unit: string;
	values: (number | undefined)[];
	deviceId?: IDeviceId;
	resourceId?: IResourceId;
}
