import { integer, primaryKey, sqliteTable } from "drizzle-orm/sqlite-core";

import { Note } from "~/drizzle/schema/Note.ts";
import { OriginalFile } from "~/drizzle/schema/OriginalFile.ts";

/**
 * One original file attached to one fixed version of a note.
 *
 * A row is written with its note version and is never changed on its own. Its
 * author and creation time are therefore those of the note version.
 *
 * PROV: prov:hadMember.
 */
export const NoteAttachment = sqliteTable(
	"NoteAttachment",
	{
		noteId: integer("note_id")
			.notNull()
			.references(() => Note.id),

		originalFileId: integer("original_file_id")
			.notNull()
			.references(() => OriginalFile.id),

		position: integer("position").notNull(),
	},
	(table) => [primaryKey({ columns: [table.noteId, table.originalFileId] })],
);
