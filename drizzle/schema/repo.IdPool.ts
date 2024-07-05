import { integer, varchar } from "drizzle-orm/pg-core";

import type { IPgSchemas } from "~/drizzle/schemaHelpers/IPgSchemas";
import { idType } from "~/drizzle/schemaHelpers/idType";
import { metadata } from "~/drizzle/schemaHelpers/metadata";
import type { IIdPoolId } from "~/lib/database/Ids";

export function IdPool(schemas: IPgSchemas) {
	return schemas.repo.table("IdPool", {
		id: idType<IIdPoolId>("id_pool_id").primaryKey().notNull(),
		counter: integer("counter").default(0).notNull(),
		digits: integer("digits").notNull(),
		alphabet: varchar("alphabet", { length: 255 }).notNull(),
		...metadata(schemas),
	});
}
