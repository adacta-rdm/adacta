import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { metadata } from "~/drizzle/schemaHelpers/metadata.ts";

/**
 * One original file, kept exactly as it was supplied.
 *
 * The row records the original name, size, and arrival time. It does not
 * describe the scientific role of the file. For example, a scanned notebook
 * page and a table of measurements are both source artifacts. Relationships
 * between a source artifact and other records are stored separately.
 */
export const SourceArtifact = sqliteTable("SourceArtifact", {
	/**
	 * The identifier is also the file name below `source-artifacts/`. For
	 * example, the bytes of artifact `a1b2` are stored at
	 * `source-artifacts/a1b2`.
	 */
	id: text("source_artifact_id").primaryKey(),

	/**
	 * The identifier of the upload that supplied this file. Files submitted
	 * together have the same value. The value can therefore be used to find all
	 * files from one upload.
	 *
	 * This column has no corresponding upload table and is not a foreign key. It
	 * records only that files were submitted together. For example, a table of
	 * measurements and its sidecar file may share an upload id. This does not
	 * establish a relationship between them. Such a relationship is recorded
	 * separately during import.
	 */
	uploadId: text("upload_id").notNull(),

	originalName: text("original_name").notNull(),

	mediaType: text("media_type"),

	byteSize: integer("byte_size").notNull(),

	...metadata(),
});
