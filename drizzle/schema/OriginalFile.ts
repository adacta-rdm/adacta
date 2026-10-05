import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { Id } from "~/drizzle/schema/Id.ts";
import { metadata } from "~/drizzle/schemaHelpers/metadata.ts";

/**
 * One original file, kept exactly as it was supplied.
 *
 * The row records the original name, size, and arrival time. It does not
 * describe the role of the file in an import.
 *
 * PROV: prov:Entity.
 */
export const OriginalFile = sqliteTable("OriginalFile", {
	/**
	 * The identifier is also the file name below `original-files/`. For
	 * example, the bytes of file 1234567890123 are stored at
	 * `original-files/1234567890123`.
	 */
	id: integer("original_file_id")
		.notNull()
		.primaryKey()
		.references(() => Id.id),

	/**
	 * The identifier of the upload that supplied this file. Files submitted
	 * together have the same value. The value can therefore be used to find all
	 * files from one upload.
	 *
	 * This column has no corresponding upload table and is not a foreign key. It
	 * records only that files were submitted together. For example, a table of
	 * measurements and its sidecar file may share an upload id.
	 */
	uploadId: integer("upload_id").notNull(),

	originalName: text("original_name").notNull(),

	mediaType: text("media_type"),

	byteSize: integer("byte_size").notNull(),

	...metadata(),
});
