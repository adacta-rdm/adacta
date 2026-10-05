import {
	type AnySQLiteColumn,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { Id } from "~/drizzle/schema/repo.Id.ts";
import { metadata } from "~/drizzle/schemaHelpers/metadata.ts";

/**
 * One version of a free-text note about a sample batch, sample, or rig.
 *
 * An edit creates another row. A removed note keeps its current row with an
 * archive time. The complete wording used at any point therefore remains
 * available.
 *
 * PROV: prov:Entity.
 */
export const Note = sqliteTable(
	"Note",
	{
		id: integer("note_id").primaryKey(),

		/**
		 * What the note is about.
		 */
		noteSubjectId: integer("note_subject_id")
			.notNull()
			.references(() => Id.id),

		body: text("body").notNull(),

		/**
		 * The moment described by the note, when it differs from the writing time.
		 */
		observedAt: integer("observed_at", { mode: "timestamp" }),

		/**
		 * The earlier version replaced by this row.
		 *
		 * PROV: prov:wasRevisionOf.
		 */
		supersedesId: integer("supersedes_id").references((): AnySQLiteColumn => Note.id),

		...metadata(),
	},
	(table) => [uniqueIndex("Note_supersedes_id_unique").on(table.supersedesId)],
);
