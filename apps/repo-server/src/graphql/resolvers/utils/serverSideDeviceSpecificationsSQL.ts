import { asc, desc, eq, sql } from "drizzle-orm";
import { unionAll } from "drizzle-orm/pg-core";

import type { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import type { IDeviceId } from "~/lib/database/Ids";

export async function serverSideDeviceSpecificationsSQL(
	deviceId: IDeviceId,
	ctx: { el: EntityLoader; schema: DrizzleSchema }
) {
	const {
		el,
		schema: { DeviceSpecification, DeviceDefinitionPaths, Device, DeviceDefinitionSpecification },
	} = ctx;
	const { drizzle } = el;

	const device = await el.one(Device, deviceId);

	const deviceDefinitions = drizzle
		.select({
			name: DeviceSpecification.name,
			value: DeviceSpecification.value,
			level: sql<number>`0`.as("level"),
		})
		.from(DeviceSpecification)
		.where(eq(DeviceSpecification.ownerId, deviceId));

	const deviceDefinitionSpecifications = drizzle
		.select({
			name: DeviceDefinitionSpecification.name,
			value: DeviceDefinitionSpecification.value,
			level: sql<number>`${DeviceDefinitionPaths.depth}+1`.as("level"),
		})
		.from(DeviceDefinitionPaths)
		.where(eq(DeviceDefinitionPaths.descendantId, device.definitionId))
		.innerJoin(
			DeviceDefinitionSpecification,
			eq(DeviceDefinitionPaths.ancestorId, DeviceDefinitionSpecification.ownerId)
		);

	// Combine the specifications of the device and its ancestors
	const union = unionAll(deviceDefinitions, deviceDefinitionSpecifications).as(
		"listOfSpecifications"
	);

	// Select the "winning" specification for each name by using selectDistinctOn with order by
	// depth ASC
	const finalSpecifications = drizzle
		.selectDistinctOn([union.name])
		.from(union)
		.orderBy((t) => [desc(t.name), asc(t.level)])
		.as("finalSpecifications");

	// Sort the final specifications by rank DESC and name ASC
	const sorted = drizzle
		.select()
		.from(finalSpecifications)
		.orderBy(desc(finalSpecifications.level), asc(finalSpecifications.name));

	return sorted;
}
