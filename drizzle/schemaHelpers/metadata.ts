import { integer, text } from "drizzle-orm/sqlite-core";

/**
 * Columns carried by every repository table.
 *
 * `metadataCreatorId` is text because Better Auth generates user ids as text.
 * It carries no foreign key: users live in the system database and each
 * repository is its own SQLite file, and SQLite cannot reference a table in an
 * attached database.
 *
 * `metadataDeletedAt` marks a soft delete. Queries must filter it out.
 */
export function metadata() {
	return {
		metadataCreatorId: text("metadata_creator_id"),
		metadataCreationTimestamp: integer("metadata_creation_timestamp", {
			mode: "timestamp",
		}).notNull(),
		metadataDeletedAt: integer("metadata_deleted_at", { mode: "timestamp" }),
	};
}
