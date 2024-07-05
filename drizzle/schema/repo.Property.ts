import { timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { Device } from "~/drizzle/schema/repo.Device";
import { Sample } from "~/drizzle/schema/repo.Sample";
import type { IPgSchemas } from "~/drizzle/schemaHelpers/IPgSchemas";
import { idType } from "~/drizzle/schemaHelpers/idType";
import type { IDeviceId, IPropertyId, ISampleId } from "~/lib/database/Ids";

export function Property(schemas: IPgSchemas) {
	return schemas.repo.table("Property", {
		id: idType<IPropertyId>("property_id").primaryKey().notNull(),

		couchId: idType<string>("couch_id").unique(),

		/**
		 * The device this property belongs to.
		 */
		ownerDeviceId: uuid("owner_device_id")
			.$type<IDeviceId>()
			.references(() => Device(schemas).id)
			.notNull(),

		/**
		 * From which point in time onwards the name/value pair defined in this object comes into effect.
		 * The name/value pairs can be overridden at a later time by adding a new Property entry with
		 * different begin and end dates.
		 */
		begin: timestamp("begin").notNull(),

		/**
		 * The point in time until the name/value pair defined in this object is no longer effective. The
		 * end date can be undefined, in which case name/value pair is currently still in effect.
		 *
		 * The field is non-optional to ensure that it must be explicitly set, even if undefined.
		 */
		end: timestamp("end"),

		/**
		 * The name of the property. Unique among all `IPropertyDocument`s belonging to the same
		 * `IDeviceDocument`.
		 */
		name: varchar("name", { length: 255 }).notNull(),

		/**
		 * The value of the property, which can be an id pointing to either a `IDeviceDocument` or a
		 * `ISampleDocument`. The type information comes from the (indirectly) related
		 * `IDeviceDefinitionDocument` object.
		 */

		/**
		 * The value of the property, which can be an id pointing to either a `IDeviceDocument` or a
		 * `ISampleDocument`, but not both.
		 */
		deviceId: idType<IDeviceId>("device_id").references(() => Device(schemas).id),

		/**
		 * The value of the property, which can be an id pointing to either a `IDeviceDocument` or a
		 * `ISampleDocument`, but not both.
		 */
		sampleId: idType<ISampleId>("sample_id").references(() => Sample(schemas).id),
	});
}
