import assert from "assert";

import { and, eq, gt } from "drizzle-orm";

import type { IDeviceDefinitionTraversalResult } from "../deriveSpecifications";

import type { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import { decodeEntityId } from "~/apps/repo-server/src/utils/decodeEntityId";
import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import type { IDeviceDefinitionId, IDeviceId } from "~/lib/database/Ids";

/**
 * Starts from a Device or Device definition and collects all related device definitions.
 * For Devices, the Device definition of this device are collected.
 * For DeviceDefinitions all parent device definitions are collected.
 */
export async function collectRelatedDefinitions(
	startId: IDeviceId | IDeviceDefinitionId,
	ctx: { el: EntityLoader; schema: DrizzleSchema },
	level = 0
): Promise<IDeviceDefinitionTraversalResult[]> {
	const {
		el,
		schema: { Device, DeviceDefinition, DeviceDefinitionPaths },
	} = ctx;

	const definitions: IDeviceDefinitionTraversalResult[] = [];

	const startDocType = decodeEntityId(startId);
	assert(startDocType === "Device" || startDocType === "DeviceDefinition"); // TODO: Change signature to include type? I think we usually know the type...

	if (startDocType === "Device") {
		const startDoc = await el.one(Device, startId);
		definitions.push(...(await collectRelatedDefinitions(startDoc.definitionId, ctx, ++level)));

		const results = await collectRelatedDefinitions(startDoc.definitionId, ctx, level + 1);

		// Continue traversal on DeviceDefinitions
		definitions.push(...results);
	} else if (startDocType === "DeviceDefinition") {
		const startDoc = await el.one(DeviceDefinition, startId);
		definitions.push({ definition: startDoc.id, level });

		const parents = await el.drizzle
			.select({ id: DeviceDefinitionPaths.ancestorId, depth: DeviceDefinitionPaths.depth })
			.from(DeviceDefinitionPaths)
			.where(
				and(eq(DeviceDefinitionPaths.descendantId, startDoc.id), gt(DeviceDefinitionPaths.depth, 0))
			);

		definitions.push(
			...parents.map(({ id, depth }) => ({
				definition: id,
				level: depth + level,
			}))
		);
	}

	return definitions;
}
