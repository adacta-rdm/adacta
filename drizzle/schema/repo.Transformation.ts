import { varchar } from "drizzle-orm/pg-core";

import { ImportPreset } from "~/drizzle/schema/repo.ImportPreset";
import type { IPgSchemas } from "~/drizzle/schemaHelpers/IPgSchemas";
import { customJsonb } from "~/drizzle/schemaHelpers/customJsonb";
import { idType } from "~/drizzle/schemaHelpers/idType";
import type { IImportPresetId, IResourceId, ITransformationId } from "~/lib/database/Ids";

export function Transformation(schemas: IPgSchemas) {
	return schemas.repo.table("Transformation", {
		id: idType<ITransformationId>("transformation_id").primaryKey().notNull(),
		couchId: idType<string>("couch_id").unique(),
		name: varchar("name", { enum: ["import", "manual"] }).notNull(),

		presetId: idType<IImportPresetId>("preset_id").references(() => ImportPreset(schemas).id),

		input: customJsonb("input").$type<{ [argName: string]: IResourceId }>().notNull(),
		output: customJsonb("output").$type<{ [resultName: string]: IResourceId }>().notNull(),
	});
}
