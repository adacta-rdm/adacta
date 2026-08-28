import { integer } from "drizzle-orm/sqlite-core";

/**
 * Columns carried by every repository table.
 *
 * `metadataCreatorId` has no foreign key. Users live in the global database and
 * each repository is its own SQLite file, and SQLite cannot reference a table in
 * an attached database.
 *
 * `metadataDeletedAt` marks a soft delete. Queries must filter it out.
 */
export function metadata() {
	return {
		metadataCreatorId: integer("metadata_creator_id"),
		metadataCreationTimestamp: integer("metadata_creation_timestamp", {
			mode: "timestamp",
		}).notNull(),
		metadataDeletedAt: integer("metadata_deleted_at", { mode: "timestamp" }),
	};
}
