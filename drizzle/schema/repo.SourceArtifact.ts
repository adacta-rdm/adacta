import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { SourceBundle } from "~/drizzle/schema/repo.SourceBundle.ts";
import { metadata } from "~/drizzle/schemaHelpers/metadata.ts";

/**
 * One immutable original file within a source bundle.
 */
export const SourceArtifact = sqliteTable("SourceArtifact", {
	/**
	 * The identifier is also used as the file name below `source-artifacts/`.
	 */
	id: text("source_artifact_id").primaryKey(),

	sourceBundleId: text("source_bundle_id")
		.notNull()
		.references(() => SourceBundle.id),

	originalName: text("original_name").notNull(),

	mediaType: text("media_type"),

	byteSize: integer("byte_size").notNull(),

	...metadata(),
});
