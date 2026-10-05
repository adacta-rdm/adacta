import { describe, expect, test } from "bun:test";

import { currentNotes } from "~/app/lib/notes.ts";
import type { Entity } from "~/drizzle/Schema.ts";

function note(overrides: Partial<Entity<"Note">> & Pick<Entity<"Note">, "id" | "body">) {
	return {
		noteSubjectId: 17,
		observedAt: null,
		supersedesId: null,
		metadataCreatorId: "first-author",
		metadataCreationTimestamp: new Date("2026-01-15T13:00:00.000Z"),
		metadataArchivedAt: null,
		...overrides,
	} satisfies Entity<"Note">;
}

describe("currentNotes", () => {
	test("returns current text with the first creator and edit details", () => {
		const first = note({ id: 1, body: "Powder is grey." });
		const edit = note({
			id: 2,
			body: "Powder is light grey.",
			supersedesId: first.id,
			metadataCreatorId: "editor",
			metadataCreationTimestamp: new Date("2026-01-16T14:00:00.000Z"),
		});

		expect(currentNotes([first, edit])).toEqual([
			{
				id: edit.id,
				versionIds: [edit.id, first.id],
				body: edit.body,
				authorId: "first-author",
				writtenAt: first.metadataCreationTimestamp,
				edit: {
					authorId: "editor",
					editedAt: edit.metadataCreationTimestamp,
				},
				attachments: [],
			},
		]);
	});

	test("orders chains by their first row and omits an archived current version", () => {
		const later = note({
			id: 3,
			body: "Later",
			metadataCreationTimestamp: new Date("2026-01-17T12:00:00.000Z"),
		});
		const earlier = note({
			id: 4,
			body: "Earlier",
			metadataCreationTimestamp: new Date("2026-01-16T12:00:00.000Z"),
		});
		const removed = note({
			id: 5,
			body: "Removed",
			metadataCreationTimestamp: new Date("2026-01-15T12:00:00.000Z"),
			metadataArchivedAt: new Date("2026-01-18T12:00:00.000Z"),
		});

		expect(currentNotes([later, earlier, removed]).map((entry) => entry.body)).toEqual([
			"Earlier",
			"Later",
		]);
	});
});
