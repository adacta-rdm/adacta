import type { UnitKind } from "@omegadot/einheiten/dist/types/quantities/kind";
import { uuid, varchar } from "drizzle-orm/pg-core";

import type { IPgSchemas } from "~/drizzle/schemaHelpers/IPgSchemas";
import { customJsonb } from "~/drizzle/schemaHelpers/customJsonb";
import { idType } from "~/drizzle/schemaHelpers/idType";
import { metadata } from "~/drizzle/schemaHelpers/metadata";
import type { IDeviceDefinitionId, IResourceId } from "~/lib/database/Ids";
import type { ISpecification } from "~/lib/database/documents/interfaces/ISpecification";

export function DeviceDefinition(schemas: IPgSchemas) {
	return schemas.repo.table("DeviceDefinition", {
		id: idType<IDeviceDefinitionId>("device_definition_id").primaryKey().notNull(),

		couchId: idType<string>("couch_id").unique(),

		/**
		 * Display name of device definition
		 */
		name: varchar("name", { length: 255 }).notNull(),

		/**
		 * A list of image resources
		 */
		imageResourceIds: uuid("image_resource_ids").array().notNull().$type<IResourceId[]>(),
		// FK Constraint not possible with arrays
		// .references(() => resources.id),

		/**
		 * List of unit kinds this device can record
		 */
		acceptsUnit: varchar("acceptsUnit").array().notNull().$type<UnitKind[]>(),

		/**
		 * List of device definitions this device inherits specifications
		 */
		LEGACY_parentDeviceDefinitionIds: idType<IDeviceDefinitionId>(
			"parent_device_definition_ids"
		).array(),
		// .notNull(),

		/**
		 * List of specifications that this `IDeviceDefinitionDocument` defines.
		 */
		LEGACY_specifications: customJsonb("specifications").$type<ISpecification[]>(), //.notNull(),

		...metadata(schemas),
	});
}
