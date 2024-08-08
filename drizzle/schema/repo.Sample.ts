import { index, varchar } from "drizzle-orm/pg-core";

import type { IPgSchemas } from "~/drizzle/schemaHelpers/IPgSchemas";
import { customJsonb } from "~/drizzle/schemaHelpers/customJsonb";
import { idType } from "~/drizzle/schemaHelpers/idType";
import { metadata } from "~/drizzle/schemaHelpers/metadata";
import { tsvector } from "~/drizzle/schemaHelpers/tsvector";
import type { ISampleId } from "~/lib/database/Ids";
import type { ISpecification } from "~/lib/database/documents/interfaces/ISpecification";

export function Sample(schemas: IPgSchemas) {
	return schemas.repo.table(
		"Sample",
		{
			id: idType<ISampleId>("sample_id").primaryKey().notNull(),

			/**
			 * The couch_id is the unique identifier of the document in the CouchDB database.
			 */
			couchId: idType<string>("couch_id").unique(),

			name: varchar("name", { length: 255 }).notNull(),

			/**
			 * List of specifications that this sample defines.
			 */
			LEGACY_specifications: customJsonb("specifications").$type<ISpecification[]>(), //.notNull(),
			...metadata(schemas),

			search: tsvector("search", { sources: ["name"] }),
		},
		(t) => ({
			idx_search: index("idx_search_sample").using("gin", t.search),
		})
	);
}
