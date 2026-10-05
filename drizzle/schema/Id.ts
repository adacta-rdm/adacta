import { integer, sqliteTable } from "drizzle-orm/sqlite-core";

/**
 * Every record that other features can refer to has its ID in this table. The
 * record's own table uses the same ID as its primary key and references this
 * table. For example, a rig in InventoryEntry has a row here with the same ID.
 * Rows of other tables, such as vocabularies and link tables, have no row here.
 *
 * A feature that applies to several kinds of record therefore needs only one
 * foreign key, which points to this table. For example, a note can be about a
 * rig, a sample, or a sample batch. The note has one column that references
 * Id, and that column serves all three.
 *
 * This avoids one column per kind of record. Without this table, Note would
 * need a column for each kind, with a check that exactly one of them is set.
 * Every new kind of record would add a column to Note and a case to the code
 * that reads notes. Tags and provenance links would need the same columns
 * again.
 */
export const Id = sqliteTable("Id", {
	id: integer("id").notNull().primaryKey(),
});
