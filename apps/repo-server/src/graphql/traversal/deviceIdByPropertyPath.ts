import assert from "assert";

import { and, eq } from "drizzle-orm";

import { narrowTimeframe } from "./narrowTimeframe";
import type { EntityLoader } from "../../services/EntityLoader";
import { propertyPathToString } from "../../utils/propertyPathToString";

import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import { assertDefined } from "~/lib/assert/assertDefined";
import type { IDeviceId } from "~/lib/database/Ids";

export async function deviceIdByPropertyPath(
	el: EntityLoader,
	schema: DrizzleSchema,
	parentDeviceId: IDeviceId,
	childPath: string[],
	begin: Date,
	end: Date
): Promise<IDeviceId> {
	const { Property } = schema;
	let currentDeviceId = parentDeviceId;
	let currentBegin = begin;
	let currentEnd = end;
	const currentPath: string[] = [];
	for (const segment of childPath) {
		currentPath.push(segment);

		const rawProperties = await el.find(
			Property,
			and(eq(Property.ownerDeviceId, currentDeviceId), eq(Property.name, segment))
		);

		// const rawProperties = await dbm.db.query("property/by_device_and_name", {
		// 	key: [currentDeviceId, segment],
		// 	include_docs: true,
		// });
		const properties = rawProperties
			// .map((r) => r.doc as IPropertyDocument | undefined)
			.filter((property) => {
				if (!property.deviceId) return false;

				// Only consider devices that are fitted for the whole time period of interest
				return property.begin <= currentBegin && (!property.end || property.end >= currentEnd);
			});

		if (properties.length === 0) {
			throw new Error(
				`No device at "${propertyPathToString(
					currentPath
				)}" in range: ${currentBegin.toISOString()} - ${currentEnd.toISOString()}`
			);
		}

		assert(properties.length === 1, "More than one device in the same slot at the same time");
		const property = properties[0];

		const [newBegin, newEnd] = narrowTimeframe(
			[new Date(property.begin), currentBegin],
			[property.end ? new Date(property.end) : undefined, currentEnd]
		);
		assertDefined(newBegin);
		assertDefined(newEnd);
		currentBegin = newBegin;
		currentEnd = newEnd;

		assertDefined(property);
		currentDeviceId = property.deviceId as IDeviceId;
	}
	return currentDeviceId;
}
