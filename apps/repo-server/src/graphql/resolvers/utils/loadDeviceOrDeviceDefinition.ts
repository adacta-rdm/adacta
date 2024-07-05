import type { EntityLoader } from "../../../services/EntityLoader";

import { decodeEntityId } from "~/apps/repo-server/src/utils/decodeEntityId";
import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";

export async function loadDeviceOrDeviceDefinition(
	id: string,
	el: EntityLoader,
	schema: DrizzleSchema
) {
	const type = decodeEntityId(id);
	if (type !== "Device" && type !== "DeviceDefinition") {
		throw new Error(`Invalid type for makePrimaryDeviceImage: ${type}`);
	}

	const thing =
		type === "Device" ? await el.one(schema.Device, id) : await el.one(schema.DeviceDefinition, id);

	return { type, thing };
}
