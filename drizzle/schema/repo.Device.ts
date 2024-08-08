import { index, uuid, varchar } from "drizzle-orm/pg-core";

import { DeviceDefinition } from "~/drizzle/schema/repo.DeviceDefinition";
import type { IPgSchemas } from "~/drizzle/schemaHelpers/IPgSchemas";
import { customJsonb } from "~/drizzle/schemaHelpers/customJsonb";
import { idType } from "~/drizzle/schemaHelpers/idType";
import { metadata } from "~/drizzle/schemaHelpers/metadata";
import { tsvector } from "~/drizzle/schemaHelpers/tsvector";
import type { IDeviceDefinitionId, IDeviceId, IResourceId } from "~/lib/database/Ids";
import type { ISpecification } from "~/lib/database/documents/interfaces/ISpecification";
import type { ISetupDescription } from "~/lib/interface/ISetupDescription";

export function Device(schemas: IPgSchemas) {
	return schemas.repo.table(
		"Device",
		{
			id: idType<IDeviceId>("device_id").primaryKey().notNull(),

			/**
			 * The couch_id is the unique identifier of the document in the CouchDB database.
			 */
			couchId: idType<string>("couch_id").unique(),

			/**
			 * A short identifier that can be used to identify this device. Once assigned, this id must not be changed because
			 * it may have been used in locations that are outside of Adacta's control (e.g. in a printed label).
			 */
			shortId: varchar("short_id", { length: 255 }),

			/**
			 * The related `IDeviceDefinitionDocument` defines the allowed properties and their types this
			 * device may have. Also contains a list of `ISpecificationDocument`s that represent
			 * characteristics common to all devices belonging to the same `IDeviceDefinitionDocument`.
			 */
			definitionId: idType<IDeviceDefinitionId>("device_definition_id")
				.notNull()
				.references(() => DeviceDefinition(schemas).id),

			/**
			 * Display name of device definition
			 */
			name: varchar("name", { length: 255 }).notNull(),

			/**
			 * A list of image resources
			 */
			imageResourceIds: uuid("image_resources").array().notNull().$type<IResourceId[]>(),
			// FK Constraint not possible with arrays
			// 	.references(() => resources.id),

			/**
			 * A setup description contains:
			 *    - an image resource (e.g. a photo of the device or a flow chart)
			 *    - a list of labels that can be used to describe where the components of the device are
			 */
			setupDescription: customJsonb("setup_description").notNull().$type<ISetupDescription[]>(),

			/**
			 * List of specifications that this `IDeviceDocument` defines.
			 * Device specifications should be used for properties that do not change over time and are
			 * unique to this device (e.g. serial number). Properties that are valid for multiple devices
			 * (e.g. manufacturer) should be part of the device definition.
			 */
			LEGACY_specifications: customJsonb("specifications").$type<ISpecification[]>(), //.notNull(),

			search: tsvector("search", { sources: ["name", "short_id"] }),

			...metadata(schemas),
		},
		(t) => ({
			idx_search: index("idx_search_device").using("gin", t.search),
		})
	);
}
