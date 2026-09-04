import { integer, text } from "drizzle-orm/sqlite-core";

/**
 * Columns carried by every repository table.
 *
 * `metadataCreatorId` identifies the user credited as creator and is required.
 * It is text because Better Auth generates user ids as text. It carries no
 * foreign key. Users live in the system database. Each repository is its own
 * SQLite file. SQLite cannot reference a table in an attached database.
 *
 * `metadataArchivedAt` removes a record from normal workflows while preserving
 * its history. Queries for active records must filter it out.
 */
export function metadata() {
	return {
		metadataCreatorId: text("metadata_creator_id").notNull(),
		metadataCreationTimestamp: integer("metadata_creation_timestamp", {
			mode: "timestamp",
		}).notNull(),
		metadataArchivedAt: integer("metadata_archived_at", { mode: "timestamp" }),
	};
}
