import { varchar } from "drizzle-orm/pg-core";
import { integer } from "drizzle-orm/pg-core";

import type { IPgSchemas } from "~/drizzle/schemaHelpers/IPgSchemas";
import { idType } from "~/drizzle/schemaHelpers/idType";
import { metadata } from "~/drizzle/schemaHelpers/metadata";
import type { INameCompositionId } from "~/lib/database/Ids";

export function NameComposition(schemas: IPgSchemas) {
	return schemas.repo.table("NameComposition", {
		id: idType<INameCompositionId>("name_composition_id").primaryKey().notNull(),
		name: varchar("name", { length: 255 }).notNull(),
		legacyNameIndex: integer("legacy_name_index"),
		shortIdIndex: integer("short_id_index"),
		...metadata(schemas),
	});
}
