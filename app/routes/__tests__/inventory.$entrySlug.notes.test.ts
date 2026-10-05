import { describe, expect, test } from "bun:test";

import * as notesRoute from "~/app/routes/inventory.$entrySlug.notes.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { NoteManager } from "~/app/services/NoteManager.ts";
import { createTestNote, createTestRig } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope, storedFiles } from "~/app/testUtils/testUtils.ts";
import { OriginalFile } from "~/drizzle/schema/OriginalFile.ts";

describe("inventory.$entrySlug.notes", () => {
	describe("loader", () => {
		test("responds with 404 for an entry that is not a rig", async () => {
			const scope = await setupTestRequestScope();
			const entry = await createTestRig(scope, { kind: "equipment" });
			const route = testRoute(scope, notesRoute, { entrySlug: entry.slug });

			const result = await route.loader();

			expect(result.status).toBe(404);
		});

		test("lists rig notes by observed time", async () => {
			const scope = await setupTestRequestScope();
			const rig = await createTestRig(scope);
			await createTestNote(scope, rig.id, {
				body: "Later",
				observedAt: new Date("2026-09-21T15:00:00.000Z"),
				metadataCreationTimestamp: new Date("2026-09-21T15:01:00.000Z"),
			});
			await createTestNote(scope, rig.id, {
				body: "Earlier",
				observedAt: new Date("2026-09-21T14:00:00.000Z"),
				metadataCreationTimestamp: new Date("2026-09-21T15:02:00.000Z"),
			});
			const route = testRoute(scope, notesRoute, { entrySlug: rig.slug });

			const result = await route.loader();

			expect(result.status).toBe(200);
			expect(result.data!.notes.map((note) => note.body)).toEqual(["Earlier", "Later"]);
		});
	});

	describe("action", () => {
		test("adds a note to a rig", async () => {
			const scope = await setupTestRequestScope();
			const rig = await createTestRig(scope);
			const route = testRoute(scope, notesRoute, { entrySlug: rig.slug });

			const result = await route.action({
				addNote: "",
				body: "Flow became unstable.",
				observedAt: "2026-09-21T14:32:00.000Z",
			});

			expect(result.status).toBe(303);
			expect(result.location).toBe(`/inventory/${rig.slug}/notes`);
			expect((await route.loader()).data!.notes).toMatchObject([
				{
					body: "Flow became unstable.",
					observedAt: new Date("2026-09-21T14:32:00.000Z"),
				},
			]);
		});

		test("refuses a new note with an invalid observed time and discards its files", async () => {
			const scope = await setupTestRequestScope();
			const rig = await createTestRig(scope);
			const route = testRoute(scope, notesRoute, { entrySlug: rig.slug });

			const result = await route.action(
				{
					addNote: "",
					body: "Pressure dropped.",
					observedAt: "2026-09-21T14:32:00",
				},
				{ files: [new File(["photo"], "pressure.jpg", { type: "image/jpeg" })] },
			);

			expect(result.status).toBe(400);
			expect(result.data).toEqual({
				noteErrors: { observedAt: "Enter a valid observed time. Attach the files again." },
			});
			expect((await route.loader()).data!.notes).toEqual([]);
			expect(storedFiles(scope)).toEqual([]);
		});

		test("discards files when an edit has an invalid observed time", async () => {
			const scope = await setupTestRequestScope();
			const rig = await createTestRig(scope);
			const note = await createTestNote(scope, rig.id, {
				body: "Pressure dropped.",
				observedAt: new Date("2026-09-21T12:32:00.000Z"),
			});
			const route = testRoute(scope, notesRoute, { entrySlug: rig.slug });

			const result = await route.action(
				{
					editNote: String(note.id),
					body: "Pressure dropped briefly.",
					observedAt: "2026-09-21T14:32:00",
				},
				{ files: [new File(["photo"], "pressure.jpg", { type: "image/jpeg" })] },
			);

			expect(result.status).toBe(400);
			expect(result.data).toEqual({
				noteErrors: { observedAt: "Enter a valid observed time. Attach the files again." },
			});
			expect((await route.loader()).data!.notes).toMatchObject([
				{ body: note.body, observedAt: note.observedAt },
			]);
			expect(await scope.get(ApplicationDatabase).select().from(OriginalFile).all()).toEqual([]);
			expect(storedFiles(scope)).toEqual([]);
		});

		test("discards files when the edited note is no longer current", async () => {
			const scope = await setupTestRequestScope();
			const rig = await createTestRig(scope);
			const observedAt = new Date("2026-09-21T12:32:00.000Z");
			const note = await createTestNote(scope, rig.id, { body: "First version", observedAt });
			await scope.get(NoteManager).edit(note.id, [rig.id], { body: "Current version", observedAt });
			const route = testRoute(scope, notesRoute, { entrySlug: rig.slug });

			const result = await route.action(
				{
					editNote: String(note.id),
					body: "Late edit",
					observedAt: observedAt.toISOString(),
				},
				{ files: [new File(["photo"], "pressure.jpg", { type: "image/jpeg" })] },
			);

			expect(result.status).toBe(404);
			expect((await route.loader()).data!.notes).toMatchObject([{ body: "Current version" }]);
			expect(await scope.get(ApplicationDatabase).select().from(OriginalFile).all()).toEqual([]);
			expect(storedFiles(scope)).toEqual([]);
		});

		test.each([["editNote"], ["archiveNote"]])(
			"answers 404 and discards files for an invalid ID in %p",
			async (field) => {
				const scope = await setupTestRequestScope();
				const rig = await createTestRig(scope);
				const route = testRoute(scope, notesRoute, { entrySlug: rig.slug });

				const result = await route.action(
					{
						[field]: "abc",
						body: "Changed",
						observedAt: "2026-09-21T12:32:00.000Z",
					},
					{ files: [new File(["photo"], "pressure.jpg", { type: "image/jpeg" })] },
				);

				expect(result.status).toBe(404);
				expect(storedFiles(scope)).toEqual([]);
			},
		);
	});
});
