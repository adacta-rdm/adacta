import { varchar } from "drizzle-orm/pg-core";

import type { IPgSchemas } from "~/drizzle/schemaHelpers/IPgSchemas";

export function RepositoryConfigEntry(schemas: IPgSchemas) {
	return schemas.repo.table("RepositoryConfigEntry", {
		key: varchar("key", { length: 255 }).primaryKey().notNull(),
		value: varchar("value", { length: 255 }).notNull(),
	});
}
