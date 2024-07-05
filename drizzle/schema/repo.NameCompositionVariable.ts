import { text, varchar } from "drizzle-orm/pg-core";

import type { IPgSchemas } from "~/drizzle/schemaHelpers/IPgSchemas";
import { idType } from "~/drizzle/schemaHelpers/idType";
import { metadata } from "~/drizzle/schemaHelpers/metadata";
import type { INameCompositionVariableId } from "~/lib/database/Ids";

export function NameCompositionVariable(schemas: IPgSchemas) {
	return schemas.repo.table("NameCompositionVariable", {
		id: idType<INameCompositionVariableId>("name_composition_variable_id").primaryKey().notNull(),
		name: varchar("name", { length: 255 }).notNull(),
		value: varchar("value", { length: 255 }),
		alias: text("alias").array(),
		prefix: varchar("prefix", { length: 255 }),
		suffix: varchar("suffix", { length: 255 }),
		...metadata(schemas),
	});
}
