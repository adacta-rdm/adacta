import { and, eq } from "drizzle-orm";

import type { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import type { IDeviceDefinitionId, IDeviceId } from "~/lib/database/Ids";

export async function deviceDefinitionUsages(
	id: IDeviceDefinitionId,
	el: EntityLoader,
	{ DeviceDefinitionPaths, Device }: DrizzleSchema
): Promise<
	(
		| {
				__typename: "DeviceDefinition";
				id: IDeviceDefinitionId;
		  }
		| {
				__typename: "Device";
				id: IDeviceId;
		  }
	)[]
> {
	const children = await el.drizzle
		.select({ id: DeviceDefinitionPaths.ancestorId })
		.from(DeviceDefinitionPaths)
		.where(
			and(
				eq(DeviceDefinitionPaths.ancestorId, id), // Identify relationships with `id` as the parent
				eq(DeviceDefinitionPaths.depth, 1) // Get only direct children
			)
		);

	const devices = await el.find(Device, eq(Device.definitionId, id));

	return [
		...children.map(({ id }) => ({
			__typename: "DeviceDefinition" as const,
			id,
		})),
		...devices.map(({ id }) => ({
			__typename: "Device" as const,
			id,
		})),
	];
}
