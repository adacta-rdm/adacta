import { describe, expect, test } from "bun:test";

import * as batchRoute from "~/app/routes/$repo.samples.$batchSlug.tsx";
import { NoteManager } from "~/app/services/NoteManager.ts";
import { RepoDB } from "~/app/services/RepoDB.ts";
import { RepoManager } from "~/app/services/RepoManager.ts";
import { Security } from "~/app/services/Security.ts";
import { UploadManager } from "~/app/services/UploadManager.ts";
import { createTestBatch, createTestSample, createTestNote } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import {
	setupTestRepositoryEnvironment,
	signUpTestUser,
	storedFiles,
	captureTestLogs,
} from "~/app/testUtils/testUtils.ts";
import { Id } from "~/drizzle/schema/repo.Id.ts";
import { Note } from "~/drizzle/schema/repo.Note.ts";
import { OriginalFile } from "~/drizzle/schema/repo.OriginalFile.ts";
import { Sample } from "~/drizzle/schema/repo.Sample.ts";
import { id53 } from "~/lib/id53/id53.ts";

describe("$repo.samples.$batchSlug", () => {
	describe("loader", () => {
		test("returns current text with the first author and edit details", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const firstAuthorId = scope.get(Security).userId;
			const editorId = await signUpTestUser(scope, {
				name: "Zoe Researcher",
				email: "zoe.researcher@example.com",
			});
			await scope.get(RepoManager).grantAccess(editorId, "test");
			const batch = await createTestBatch(scope);
			const original = await createTestNote(scope, batch.id, {
				body: "Powder is grey.",
				metadataCreatorId: firstAuthorId,
				metadataCreationTimestamp: new Date("2026-01-15T13:00:00.000Z"),
			});
			const edit = await createTestNote(
				scope,
				batch.id,
				{
					body: "Powder is light grey.",
					metadataCreatorId: editorId,
					metadataCreationTimestamp: new Date("2026-01-16T14:00:00.000Z"),
				},
				{ supersedes: original },
			);
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			const { notes } = (await route.loader()).data!;

			expect(notes).toEqual([
				{
					id: edit.id,
					versionIds: [edit.id, original.id],
					body: "Powder is light grey.",
					attachments: [],
					author: expect.objectContaining({ id: firstAuthorId, name: "Test User" }),
					writtenAt: original.metadataCreationTimestamp,
					edit: {
						author: expect.objectContaining({ id: editorId, name: "Zoe Researcher" }),
						editedAt: edit.metadataCreationTimestamp,
					},
				},
			]);
		});

		test("orders notes by their first row and leaves out a removed note", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope);
			await createTestNote(scope, batch.id, {
				body: "Later note",
				metadataCreationTimestamp: new Date("2026-01-17T12:00:00.000Z"),
			});
			await createTestNote(scope, batch.id, {
				body: "Earlier note",
				metadataCreationTimestamp: new Date("2026-01-16T12:00:00.000Z"),
			});
			await createTestNote(scope, batch.id, {
				body: "Removed note",
				metadataArchivedAt: new Date("2026-01-18T12:00:00.000Z"),
			});
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			const result = await route.loader();

			expect(result.status).toBe(200);
			expect(result.data!.notes.map((note) => note.body)).toEqual(["Earlier note", "Later note"]);
		});

		test("returns a sample note with the sample name", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope);
			const sample = await createTestSample(scope, batch, { name: "#03" });
			await createTestNote(scope, sample.id, {
				body: "The edge is chipped.",
			});
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			const { notes } = (await route.loader()).data!;

			expect(notes).toHaveLength(1);
			expect(notes[0]).toMatchObject({ body: "The edge is chipped.", sampleName: "#03" });
		});

		test("shows that a note is about an archived sample", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope);
			const sample = await createTestSample(scope, batch, { metadataArchivedAt: new Date() });
			await createTestNote(scope, sample.id, { body: "Cracked during drying." });
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			const result = await route.loader();

			expect(result.data!.notes).toEqual([
				expect.objectContaining({ sampleName: "#01", sampleArchived: true }),
			]);
		});

		test("returns the files attached to the current note version", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope);
			const upload = scope.get(UploadManager).beginUpload();
			const fileId = await upload.add({
				originalName: "powder.jpg",
				mediaType: "image/jpeg",
				source: new Blob([new Uint8Array(512)]).stream(),
			});
			await scope.get(NoteManager).add(batch.id, { body: "Powder after drying." }, upload);
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			const result = await route.loader();

			expect(result.data!.notes[0]?.attachments).toEqual([
				{
					id: fileId,
					originalName: "powder.jpg",
					mediaType: "image/jpeg",
					byteSize: 512,
					position: 0,
				},
			]);
		});

		test.each([false, true])(
			"reports whether the batch is archived when archived is %p",
			async (archived) => {
				const scope = await setupTestRepositoryEnvironment();
				const batch = await createTestBatch(scope, {
					metadataArchivedAt: archived ? new Date() : null,
				});
				const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

				const result = await route.loader();

				expect(result.status).toBe(200);
				expect(result.data!.batch.name).toBe(batch.name);
				expect(result.data!.archived).toBe(archived);
			},
		);
	});

	describe("action", () => {
		test("adds a note through its own form operation", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope);
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			const result = await route.action({
				addNote: "",
				body: "  The powder turned grey.  ",
			});

			expect(result.status).toBe(303);
			expect((await route.loader()).data!.notes).toMatchObject([
				{ body: "The powder turned grey." },
			]);
		});

		test("adds uploaded files to a note", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope);
			const fields = { addNote: "", body: "Two files" };
			const files = [
				new File(["first"], "first.txt", { type: "text/plain" }),
				new File(["second"], "second.txt", { type: "text/plain" }),
			];
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			const result = await route.action(fields, { files });

			expect(result.status).toBe(303);
			expect((await route.loader()).data!.notes[0]?.attachments).toMatchObject([
				{ originalName: "first.txt", position: 0 },
				{ originalName: "second.txt", position: 1 },
			]);
		});

		test("discards uploaded files when an empty note is refused", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope);
			const fields = { addNote: "", body: "  " };
			const files = [new File(["photo"], "powder.jpg", { type: "image/jpeg" })];
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			const result = await route.action(fields, { files });

			expect(result.status).toBe(400);
			expect(result.data).toEqual({
				noteErrors: { body: "A note cannot be empty. Attach the files again." },
			});
			expect(await scope.get(RepoDB).select().from(OriginalFile).all()).toEqual([]);
			expect(storedFiles(scope)).toEqual([]);
		});

		test("answers 404 and discards files for a sample of another batch", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope);
			const otherBatch = await createTestBatch(scope, { name: "Other batch" });
			const sample = await createTestSample(scope, otherBatch);
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			const result = await route.action(
				{ addNote: "", about: `sample:${sample.id}`, body: "Wrong batch" },
				{ files: [new File(["photo"], "powder.jpg", { type: "image/jpeg" })] },
			);

			expect(result.status).toBe(404);
			expect((await route.loader()).data!.notes).toEqual([]);
			expect(storedFiles(scope)).toEqual([]);
		});

		test.each([["rig"], ["sample:abc"], ["sample:"]])(
			"answers 404 for the subject %p",
			async (about) => {
				const scope = await setupTestRepositoryEnvironment();
				const batch = await createTestBatch(scope);
				const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

				await expect(
					route.action({
						addNote: "",
						about,
						body: "A note",
					}),
				).resolves.toMatchObject({ status: 404 });
				expect(await scope.get(RepoDB).select().from(Note).all()).toEqual([]);
			},
		);

		test.each(["editNote", "archiveNote"])(
			"refuses %s for a note about an archived sample",
			async (field) => {
				const scope = await setupTestRepositoryEnvironment();
				const batch = await createTestBatch(scope);
				const sample = await createTestSample(scope, batch, { metadataArchivedAt: new Date() });
				const note = await createTestNote(scope, sample.id, { body: "Keep this note" });
				const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

				const result = await route.action({ [field]: String(note.id), body: "Changed" });

				expect(result.status).toBe(404);
				expect((await route.loader()).data!.notes).toMatchObject([
					{ id: note.id, body: note.body },
				]);
				expect(await scope.get(RepoDB).select().from(Note).all()).toEqual([note]);
			},
		);

		test("returns note errors separately from sample errors", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope);
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			const result = await route.action({ addNote: "", body: "  " });

			expect(result.status).toBe(400);
			expect(result.data).toEqual({ noteErrors: { body: "A note cannot be empty." } });
		});

		test("edits a note through its form operation", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope);
			const original = await createTestNote(scope, batch.id, { body: "First version" });
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			const result = await route.action({ editNote: String(original.id), body: "Current version" });

			expect(result.status).toBe(303);
			const current = (await route.loader()).data!.notes[0];
			expect(current.body).toBe("Current version");
			expect(current.versionIds).toContain(original.id);
		});

		test("removes a note through its form operation", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope);
			const original = await createTestNote(scope, batch.id, { body: "First version" });
			const current = await createTestNote(
				scope,
				batch.id,
				{
					body: "Current version",
				},
				{ supersedes: original },
			);
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			const result = await route.action({ archiveNote: String(current.id) });

			expect(result.status).toBe(303);
			expect((await route.loader()).data!.notes).toEqual([]);
			const stored = await scope.get(RepoDB).select().from(Note).all();
			expect(stored).toHaveLength(2);
			expect(stored.find((note) => note.id === current.id)?.metadataArchivedAt).toBeInstanceOf(
				Date,
			);
		});

		test("returns all add-form validation errors together", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope);
			const outsider = await signUpTestUser(scope, { email: "outsider@example.com" });
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			const result = await route.action({
				add: "",
				name: " ",
				preparedById: outsider,
			});

			expect(result.status).toBe(400);
			expect(result.data).toEqual({
				errors: {
					name: "A sample name is required.",
					preparedById: "The selected preparer is not a user of this repository.",
				},
			});
			expect((await route.loader()).data!.samples).toEqual([]);
		});

		test("returns a form error for an unrecognized operation", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope);
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			const result = await route.action({});

			expect(result.status).toBe(400);
			expect(result.data).toEqual({
				errors: { form: "The sample action is not recognized." },
			});
		});

		test("adds a sample and shows it through the loader", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope);
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			const result = await route.action({
				add: "",
				name: "#01",
				preparedById: scope.get(Security).userId,
			});

			expect(result.status).toBe(303);
			const { samples } = (await route.loader()).data!;
			expect(samples.map((sample) => sample.name)).toEqual(["#01"]);
		});

		test("takes the batch preparer when the form sends none", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope);
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			const result = await route.action({
				add: "",
				name: "#01",
			});

			expect(result.status).toBe(303);
			const { samples } = (await route.loader()).data!;
			expect(samples[0]?.preparedById).toBe(batch.preparedById);
		});

		test("records the sample preparer separately from the record creator", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope);
			const preparedById = await signUpTestUser(scope, {
				name: "Zoe Researcher",
				email: "zoe.researcher@example.com",
			});
			await scope.get(RepoManager).grantAccess(preparedById, "test");
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			const result = await route.action({
				add: "",
				name: "#01",
				preparedById,
			});

			expect(result.status).toBe(303);
			expect((await route.loader()).data!.samples[0]?.preparedBy).toEqual({
				id: preparedById,
				name: "Zoe Researcher",
			});
			expect((await route.loader()).data!.samples[0]?.metadataCreatorId).toBe(
				scope.get(Security).userId,
			);
		});

		test("rejects a duplicate label within the batch", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope);
			await createTestSample(scope, batch);
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			const result = await route.action({ add: "", name: "#01" });

			expect(result.status).toBe(400);
			expect(result.data).toEqual({
				errors: { name: 'This batch already contains a sample named "#01".' },
			});
			expect((await route.loader()).data!.samples).toHaveLength(1);
		});

		test("reports when five generated sample slugs are already in use", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope);
			for (let attempt = 1; attempt <= 5; attempt++) {
				const id = id53();
				const db = scope.get(RepoDB);
				await db.batch([
					db.insert(Id).values({ id }),
					db.insert(Sample).values({
						id,
						batchId: batch.id,
						name: `existing-${attempt}`,
						slug: attempt === 1 ? "01" : `01-${attempt}`,
						preparedById: batch.preparedById,
						metadataCreatorId: scope.get(Security).userId,
						metadataCreationTimestamp: batch.metadataCreationTimestamp,
					}),
				]);
			}
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });
			const lines = captureTestLogs(scope);

			const result = await route.action({ add: "", name: "01" });

			expect(result.status).toBe(400);
			expect(result.data).toEqual({
				errors: {
					name: "A URL identifier could not be created for this sample. Choose a name that differs by more than punctuation.",
				},
			});
			expect(JSON.parse(lines[0])).toMatchObject({
				level: "ERROR",
				event: "sample_slug_allocation_failed",
				repository: "test",
				batchId: batch.id,
				sampleName: "01",
				baseSlug: "01",
				attempts: 5,
			});
		});

		test("deletes a sample", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope);
			const sample = await createTestSample(scope, batch);
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			const result = await route.action({ delete: String(sample.id) });

			expect(result.status).toBe(303);
			expect((await route.loader()).data!.samples).toEqual([]);
		});

		test("refuses to delete a sample that has notes", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope);
			const sample = await createTestSample(scope, batch);
			await createTestNote(scope, sample.id, { body: "The sample has changed color." });
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			const result = await route.action({ delete: String(sample.id) });

			expect(result.status).toBe(400);
			expect(result.data).toEqual({
				errors: {
					form: "This sample has notes, so it cannot be deleted. Archive it instead.",
				},
			});
			expect((await route.loader()).data!.samples.map((sample) => sample.id)).toEqual([sample.id]);
		});

		test("answers 404 for a sample that is not there", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope);
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			await expect(
				route.action({
					delete: "999999",
				}),
			).resolves.toMatchObject({
				status: 404,
			});
		});

		test("answers 404 for a batch that is not there", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: "no-such-batch" });

			await expect(
				route.action({
					add: "",
					name: "#01",
				}),
			).resolves.toMatchObject({
				status: 404,
			});
		});

		test("a sample cannot be added to an archived batch", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const batch = await createTestBatch(scope, { metadataArchivedAt: new Date() });
			const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

			await expect(
				route.action({
					add: "",
					name: "#01",
				}),
			).resolves.toMatchObject({
				status: 404,
			});
		});

		test.each(["addNote", "editNote", "archiveNote"])(
			"refuses %s for an archived batch",
			async (field) => {
				const scope = await setupTestRepositoryEnvironment();
				const batch = await createTestBatch(scope, { metadataArchivedAt: new Date() });
				const note = await createTestNote(scope, batch.id, { body: "A note" });
				const route = testRoute(scope, batchRoute, { repo: "test", batchSlug: batch.slug });

				const result = await route.action({ [field]: String(note.id), body: "Changed" });

				expect(result.status).toBe(404);
				expect((await route.loader()).data!.notes).toMatchObject([
					{ id: note.id, body: note.body },
				]);
				expect(await scope.get(RepoDB).select().from(Note).all()).toEqual([note]);
			},
		);
	});
});
