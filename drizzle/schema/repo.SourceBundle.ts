import { sqliteTable, text } from "drizzle-orm/sqlite-core";

import { metadata } from "~/drizzle/schemaHelpers/metadata.ts";

/**
 * A group of original files supplied in one upload session.
 */
export const SourceBundle = sqliteTable("SourceBundle", {
	id: text("source_bundle_id").primaryKey(),

	...metadata(),
});
