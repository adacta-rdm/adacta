import { integer, uuid, varchar } from "drizzle-orm/pg-core";

import type { IPgSchemas } from "~/drizzle/schemaHelpers/IPgSchemas";
import { customJsonb } from "~/drizzle/schemaHelpers/customJsonb";
import { idType } from "~/drizzle/schemaHelpers/idType";
import { metadata } from "~/drizzle/schemaHelpers/metadata";
import type { IDeviceId, IImportPresetId } from "~/lib/database/Ids";
import type { ICSVPreset, IGamryPreset } from "~/lib/interface/IImportWizardPreset";

export enum ImportPresetType {
	CSV = 0,
	GAMRY = 1,
}

export function ImportPreset(schemas: IPgSchemas) {
	return schemas.repo.table("ImportPreset", {
		id: idType<IImportPresetId>("import_preset_id").primaryKey().notNull(),

		couchId: idType<string>("couch_id").unique(), // Reference to the Resource with the ImportPreset

		/**
		 * The display name
		 */
		name: varchar("name", { length: 255 }), // Is set to null if the preset was only created to capture the preset used in a specific import

		/**
		 * The devices that this preset is applicable to
		 */
		deviceIds: uuid("device_ids").array().notNull().$type<IDeviceId[]>(),

		/**
		 * The type of the preset
		 */
		type: integer("type").notNull().default(0).$type<ImportPresetType>(),

		/**
		 * The actual preset
		 */
		preset: customJsonb("preset").$type<ICSVPreset | IGamryPreset>().notNull(),

		...metadata(schemas),
	});
}
