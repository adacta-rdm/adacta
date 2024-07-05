import assert from "assert";

import { and, isNull, sql } from "drizzle-orm";

import type { EntityLoader } from "../../../services/EntityLoader";
import { collectPropertiesWithPathOfDeviceObject } from "../../traversal/collectSamples";

import { isEntityId } from "~/apps/repo-server/src/utils/isEntityId";
import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import { createDate } from "~/lib/createDate";
import type { IDeviceId, IResourceId } from "~/lib/database/Ids";

/**
 * The `usageInResource` function is used for finding resources related to a specific device.
 * @param id - Device Id for which resources are to be found
 * @param el
 * @param schema
 * @returns - The function returns an array of resources with unique ids
 */
export async function usageInResource(
	id: IDeviceId,
	el: EntityLoader,
	schema: DrizzleSchema
): Promise<{ id: IResourceId }[]> {
	// Double check if the id is a valid device id because it is used in the SQL query using sql.raw
	if (!isEntityId(id, "Device")) throw new Error(`Encountered invalid device id: ${id as string}`);

	const getResourcesByDevice = async (
		deviceId: IDeviceId,
		timeFilter?: {
			begin: Date | undefined;
			end: Date;
		}
	) => {
		let r = await el.find(
			schema.Resource,
			// https://dba.stackexchange.com/a/130863
			(t) =>
				and(
					isNull(t.metadataDeletedAt),
					sql`${t.attachment} @? '$.columns[*].deviceId ? (@ == "${sql.raw(deviceId)}")'`
				)
		);

		if (timeFilter) {
			r = r.filter((row) => {
				assert(row.attachment.type === "TabularData");
				return (
					(timeFilter.begin == undefined || createDate(row.attachment.begin) < timeFilter.begin) &&
					createDate(row.attachment.end) > timeFilter.end
				);
			});
		}

		return r.map((r) => r.id);
	};

	// Get all properties
	const { devices: properties } = await collectPropertiesWithPathOfDeviceObject(id, el, schema);

	// Iterate over all properties and find resources, which overlap with the properties
	const usagePromises = properties.map(async (p) => {
		// Construct filter for time
		const begin = p.removeDate ?? undefined;
		const end = p.installDate;
		const timeFilter = { begin: begin, end: end };

		return getResourcesByDevice(p.component.id, timeFilter);
	});

	// Process the device with ID `id`
	const resources = await getResourcesByDevice(id);

	const usages = await Promise.all(usagePromises);
	usages.push(resources);

	return [...new Set(usages.flat())].map((id) => ({ id }));
}
