import type { SQL } from "drizzle-orm";
import { and, eq, gt, isNull, lt, or } from "drizzle-orm";

import { narrowTimeframe } from "../graphql/traversal/narrowTimeframe";
import type { EntityLoader } from "../services/EntityLoader";

import { isEntityId } from "~/apps/repo-server/src/utils/isEntityId";
import type { DrizzleEntity, DrizzleSchema } from "~/drizzle/DrizzleSchema";
import type { IDeviceId, ISampleId } from "~/lib/database/Ids";

export async function findRootDevicesWithinTimeframe(
	id: IDeviceId | ISampleId,
	el: EntityLoader,
	Property: DrizzleSchema["Property"],
	begin?: Date,
	end?: Date,
	path: string[] = []
): Promise<{ device: IDeviceId; path: string[] }[]> {
	const usages = await getUsagesAsProperty2(el, Property, id, { begin, end });

	if (usages.length === 0) {
		// If there are no usages, then the device is the root device.
		// Samples cannot be root devices, so we return an empty array.
		if (isEntityId(id, "Device")) {
			return [{ device: id, path }];
		}
	}

	return (
		await Promise.all(
			usages.map((u) => {
				const t = narrowTimeframe([u.begin, begin], [u.end, end]);
				return findRootDevicesWithinTimeframe(u.ownerDeviceId, el, Property, t[0], t[1], [
					u.name,
					...path,
				]);
			})
		)
	).flat();
}

// See comment below for explanation of this function
function getUsagesAsProperty2(
	el: EntityLoader,
	Property: DrizzleSchema["Property"],
	id: IDeviceId | ISampleId,
	timeFrame: { begin?: Date; end?: Date }
): Promise<DrizzleEntity<"Property">[]> {
	const conditions: (SQL | undefined)[] = [
		isEntityId(id, "Device") ? eq(Property.deviceId, id) : eq(Property.sampleId, id),
	];

	// Only include properties which fully lie within given timeframe
	const end = timeFrame.end;
	const begin = timeFrame.begin;

	if (begin) {
		conditions.push(or(isNull(Property.end), gt(Property.end, begin)));
	}

	if (end) {
		// The original `getUsagesAsProperty` function uses `lte` instead of `lt` here, but this
		// is incorrect because it would include properties that end exactly at the end of the
		// timeframe. We want to exclude those properties, so we use `lt` instead.
		//
		// Changing this in the original function could potentially break existing functionality, so we
		// are not changing it there.
		conditions.push(lt(Property.begin, end));
	}

	return el.drizzle
		.select()
		.from(Property)
		.where(and(...conditions));
}
