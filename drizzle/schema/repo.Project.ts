import { varchar } from "drizzle-orm/pg-core";

import type { IPgSchemas } from "~/drizzle/schemaHelpers/IPgSchemas";
import { idType } from "~/drizzle/schemaHelpers/idType";
import { metadata } from "~/drizzle/schemaHelpers/metadata";
import { tsvector } from "~/drizzle/schemaHelpers/tsvector";
import type { IProjectId } from "~/lib/database/Ids";

export function Project(schemas: IPgSchemas) {
	return schemas.repo.table("Project", {
		id: idType<IProjectId>("project_id").primaryKey().notNull(),

		// Can be null, because a projects table already exists in postgres,
		// and the existing rows do not have a couch_id
		couchId: idType<string>("couch_id").unique(),
		name: varchar("name", { length: 255 }).notNull(),

		search: tsvector("search", { sources: ["name"] }),

		...metadata(schemas),
	});
}
