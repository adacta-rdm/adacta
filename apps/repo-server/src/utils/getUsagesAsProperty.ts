import { and, eq, gt, gte, isNull, lte, or } from "drizzle-orm";

import type { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import type { DrizzleEntity, DrizzleSchema } from "~/drizzle/DrizzleSchema";
import type { IDeviceId, ISampleId } from "~/lib/database/Ids";

function selectPropertyByValue(Property: DrizzleSchema["Property"], id: IDeviceId | ISampleId) {
	return or(eq(Property.sampleId, id as ISampleId), eq(Property.deviceId, id as IDeviceId)); // Identify the property with the sample/device as value
}

/**
 * Get all usages of a device or sample as a property
 *
 * @param el
 * @param Property
 * @param id
 * @param timeFrame
 * @param includeOverlaps If is set to true, then properties that are only valid for a part of the interval are also taken into account.
 */
export async function getUsagesAsProperty(
	el: EntityLoader,
	Property: DrizzleSchema["Property"],
	id: IDeviceId | ISampleId,
	timeFrame?: { begin?: Date; end?: Date },
	includeOverlaps?: boolean
): Promise<DrizzleEntity<"Property">[]> {
	const conditions = [selectPropertyByValue(Property, id)];
	if (timeFrame) {
		// Only include properties which fully lie within given timeframe
		const end = timeFrame.end;
		const begin = timeFrame.begin;

		if (includeOverlaps) {
			// Checks for properties with  overlap. Should be similar to:
			// (end_prop >= begin || end == null) && begin_prop < end &&
			if (begin) {
				conditions.push(or(isNull(Property.end), gt(Property.end, begin)));
			}

			if (end) {
				conditions.push(and(lte(Property.begin, end)));
			}
		} else {
			if (begin) {
				conditions.push(lte(Property.begin, begin));
			}

			if (end) {
				conditions.push(gte(Property.end, end));
			}
		}
	}

	return el.drizzle
		.select()
		.from(Property)
		.where(and(...conditions));
}
