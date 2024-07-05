import { decodeEntityId } from "~/apps/repo-server/src/utils/decodeEntityId";
import type { IDeviceId, ISampleId } from "~/lib/database/Ids";

export function createPropertyValue(componentId: string | IDeviceId | ISampleId) {
	const componentType = decodeEntityId(componentId);
	if (componentType !== "Device" && componentType !== "Sample") {
		throw new Error(
			`Invalid ID passed as component. Got type ${componentType} instead of Device or Sample`
		);
	}

	return componentType === "Device"
		? { deviceId: componentId as IDeviceId }
		: { sampleId: componentId as ISampleId };
}
