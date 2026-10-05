import { describe, expect, test } from "bun:test";
import { Writable } from "node:stream";

import { eq } from "drizzle-orm";

import {
	action as batchAction,
	loader as batchLoader,
} from "~/app/routes/$repo.samples.$batchSlug.tsx";
import {
	action as editBatchAction,
	loader as editBatchLoader,
} from "~/app/routes/$repo.samples.$batchSlug_.edit.tsx";
import { action as newBatchAction } from "~/app/routes/$repo.samples.new.tsx";
import { RepoAccess } from "~/app/services/RepoAccess.ts";
import { RepoDB } from "~/app/services/RepoDB.ts";
import { RepoManager } from "~/app/services/RepoManager.ts";
import { Security } from "~/app/services/Security.ts";
import { type PendingUpload, UploadManager } from "~/app/services/UploadManager.ts";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { setupTestRepositoryEnvironment, signUpTestUser } from "~/app/testUtils/testUtils.ts";
import { Id } from "~/drizzle/schema/repo.Id.ts";
import { Note } from "~/drizzle/schema/repo.Note.ts";
import { NoteAttachment } from "~/drizzle/schema/repo.NoteAttachment.ts";
import { OriginalFile } from "~/drizzle/schema/repo.OriginalFile.ts";
import { Sample } from "~/drizzle/schema/repo.Sample.ts";
import { SampleBatch } from "~/drizzle/schema/repo.SampleBatch.ts";
import { id53 } from "~/lib/id53/id53.ts";
import { LOG_LEVEL, Logger } from "~/lib/logger/Logger.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";
import { StorageEngine } from "~/lib/storage-engine/StorageEngine.ts";

/**
 * A signed-in scope working on the "demo" repository.
 */
function environment() {
	return setupTestRepositoryEnvironment("demo");
}

class TrackingUploadManager extends UploadManager {
	pendingUpload: PendingUpload | undefined;
	fileIds: number[] = [];

	override beginUpload(): PendingUpload {
		const upload = super.beginUpload();
		const add = upload.add.bind(upload);
		this.pendingUpload = upload;
		upload.add = async (file) => {
			const id = await add(file);
			this.fileIds.push(id);
			return id;
		};

		return upload;
	}
}

function post(fields: Record<string, string>): Request {
	const form = new FormData();
	for (const [name, value] of Object.entries(fields)) form.set(name, value);

	return new Request("http://localhost/demo/samples", { method: "POST", body: form });
}

async function insertBatchRecord(scope: ServiceContainer) {
	const userId = scope.get(Security).userId;
	const id = id53();
	await scope.get(RepoDB).insert(Id).values({ id }).run();

	return await scope
		.get(RepoDB)
		.insert(SampleBatch)
		.values({
			id,
			slug: "pt-batch",
			name: "Pt batch",
			preparationDate: "2026-01-15",
			preparedById: userId,
			metadataCreatorId: userId,
			metadataCreationTimestamp: new Date("2026-01-15T12:00:00.000Z"),
		})
		.returning()
		.get();
}

/**
 * Create a batch the way the page does. Returns the slug it was given.
 */
async function createBatch(scope: ServiceContainer, fields: Record<string, string> = {}) {
	const request = post({
		name: "Pt batch",
		preparationDate: "2025-01-15",
		preparedById: scope.get(Security).userId,
		...fields,
	});
	const [args] = createMiddlewareArgs(scope, { request, params: { repo: "demo" } });

	const response = await newBatchAction(args);
	if (!(response instanceof Response)) throw new Error("Expected a redirect.");

	return response.headers.get("Location")!.split("/").at(-1)!;
}

/**
 * Submit the batch page, the way its forms do.
 */
async function submitBatch(
	scope: ServiceContainer,
	batchSlug: string,
	fields: Record<string, string>,
) {
	const [args] = createMiddlewareArgs(scope, {
		request: post(fields),
		params: { repo: "demo", batchSlug },
	});

	return batchAction(args);
}

async function submitBatchForm(scope: ServiceContainer, batchSlug: string, form: FormData) {
	const [args] = createMiddlewareArgs(scope, {
		request: new Request("http://localhost/demo/samples", { method: "POST", body: form }),
		params: { repo: "demo", batchSlug },
	});

	return batchAction(args);
}

async function loadBatch(scope: ServiceContainer, batchSlug: string) {
	const [args] = createMiddlewareArgs(scope, { params: { repo: "demo", batchSlug } });

	return batchLoader(args);
}

describe("$repo.samples.$batchSlug loader notes", () => {
	test("returns current text with the first author and edit details", async () => {
		const scope = await environment();
		const db = scope.get(RepoDB);
		const firstAuthorId = scope.get(Security).userId;
		const editorId = await signUpTestUser(scope, {
			name: "Zoe Researcher",
			email: "zoe.researcher@example.com",
		});
		await scope.get(RepoManager).grantAccess(editorId, "demo");
		const batch = await insertBatchRecord(scope);
		const original = await db
			.insert(Note)
			.values({
				id: id53(),
				noteSubjectId: batch.id,
				body: "Powder is grey.",
				observedAt: null,
				supersedesId: null,
				metadataCreatorId: firstAuthorId,
				metadataCreationTimestamp: new Date("2026-01-15T13:00:00.000Z"),
			})
			.returning()
			.get();
		const edit = await db
			.insert(Note)
			.values({
				id: id53(),
				noteSubjectId: batch.id,
				body: "Powder is light grey.",
				observedAt: null,
				supersedesId: original.id,
				metadataCreatorId: editorId,
				metadataCreationTimestamp: new Date("2026-01-16T14:00:00.000Z"),
			})
			.returning()
			.get();

		const { notes } = await loadBatch(scope, batch.slug);

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
		const scope = await environment();
		const db = scope.get(RepoDB);
		const creatorId = scope.get(Security).userId;
		const batch = await insertBatchRecord(scope);
		await db
			.insert(Note)
			.values([
				{
					id: id53(),
					noteSubjectId: batch.id,
					body: "Later note",
					observedAt: null,
					supersedesId: null,
					metadataCreatorId: creatorId,
					metadataCreationTimestamp: new Date("2026-01-17T12:00:00.000Z"),
				},
				{
					id: id53(),
					noteSubjectId: batch.id,
					body: "Earlier note",
					observedAt: null,
					supersedesId: null,
					metadataCreatorId: creatorId,
					metadataCreationTimestamp: new Date("2026-01-16T12:00:00.000Z"),
				},
				{
					id: id53(),
					noteSubjectId: batch.id,
					body: "Removed note",
					observedAt: null,
					supersedesId: null,
					metadataCreatorId: creatorId,
					metadataCreationTimestamp: new Date("2026-01-15T12:00:00.000Z"),
					metadataArchivedAt: new Date("2026-01-18T12:00:00.000Z"),
				},
			])
			.run();

		const { notes } = await loadBatch(scope, batch.slug);

		expect(notes.map((note) => note.body)).toEqual(["Earlier note", "Later note"]);
	});

	test("returns a sample note with the sample name", async () => {
		const scope = await environment();
		const db = scope.get(RepoDB);
		const creatorId = scope.get(Security).userId;
		const batch = await insertBatchRecord(scope);
		const sampleId = id53();
		await db.insert(Id).values({ id: sampleId }).run();
		const sample = await db
			.insert(Sample)
			.values({
				id: sampleId,
				batchId: batch.id,
				slug: "03",
				name: "#03",
				preparedById: creatorId,
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: new Date(),
			})
			.returning()
			.get();
		await db
			.insert(Note)
			.values({
				id: id53(),
				noteSubjectId: sample.id,
				body: "The edge is chipped.",
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: new Date(),
			})
			.run();

		const { notes } = await loadBatch(scope, batch.slug);

		expect(notes).toHaveLength(1);
		expect(notes[0]).toMatchObject({ body: "The edge is chipped.", sampleName: "#03" });
	});

	test("shows that a note is about an archived sample", async () => {
		const scope = await environment();
		const slug = await createBatch(scope);
		await submitBatch(scope, slug, { add: "", name: "#01" });
		const sample = (await scope.get(RepoDB).select().from(Sample).get())!;
		await submitBatch(scope, slug, {
			addNote: "",
			about: `sample:${sample.id}`,
			body: "Cracked during drying.",
		});
		await scope
			.get(RepoDB)
			.update(Sample)
			.set({ metadataArchivedAt: new Date() })
			.where(eq(Sample.id, sample.id))
			.run();

		const { notes } = await loadBatch(scope, slug);

		expect(notes).toEqual([expect.objectContaining({ sampleName: "#01", sampleArchived: true })]);
	});

	test("returns the files attached to the current note version", async () => {
		const scope = await environment();
		const db = scope.get(RepoDB);
		const creatorId = scope.get(Security).userId;
		const batch = await insertBatchRecord(scope);
		const fileId = id53();
		const noteId = id53();
		await db.insert(Id).values({ id: fileId }).run();
		await db
			.insert(OriginalFile)
			.values({
				id: fileId,
				uploadId: id53(),
				originalName: "powder.jpg",
				mediaType: "image/jpeg",
				byteSize: 512,
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: new Date(),
			})
			.run();
		await db
			.insert(Note)
			.values({
				id: noteId,
				noteSubjectId: batch.id,
				body: "Powder after drying.",
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: new Date(),
			})
			.run();
		await db.insert(NoteAttachment).values({ noteId, originalFileId: fileId, position: 0 }).run();

		const { notes } = await loadBatch(scope, batch.slug);

		expect(notes[0]?.attachments).toEqual([
			{
				id: fileId,
				originalName: "powder.jpg",
				mediaType: "image/jpeg",
				byteSize: 512,
				position: 0,
			},
		]);
	});
});

describe("$repo.samples.new action", () => {
	test("creates a batch and redirects to it", async () => {
		const scope = await environment();

		const slug = await createBatch(scope, { activeMaterial: "Pt", support: "Al2O3" });
		const batch = (await loadBatch(scope, slug)).batch;

		expect(slug).toBe("pt-batch");
		expect(batch).toEqual(
			expect.objectContaining({
				name: "Pt batch",
				preparationDate: "2025-01-15",
				activeMaterial: "Pt",
				support: "Al2O3",
			}),
		);
		expect(await scope.get(RepoDB).select().from(Id).where(eq(Id.id, batch.id)).get()).toEqual({
			id: batch.id,
		});
	});

	test("leaves an omitted composition empty", async () => {
		const scope = await environment();

		const slug = await createBatch(scope, { activeMaterial: "  ", support: "" });

		expect((await loadBatch(scope, slug)).batch).toEqual(
			expect.objectContaining({ activeMaterial: null, support: null }),
		);
	});

	test("keeps generated slugs unique", async () => {
		const scope = await environment();

		expect(await createBatch(scope)).toBe("pt-batch");
		expect(await createBatch(scope)).toBe("pt-batch-2");
	});

	test("records the preparer separately from the record creator", async () => {
		const scope = await environment();
		const preparedById = await signUpTestUser(scope, {
			name: "Zoe Researcher",
			email: "zoe.researcher@example.com",
		});
		await scope.get(RepoManager).grantAccess(preparedById, "demo");

		const slug = await createBatch(scope, { preparedById });
		const { batch } = await loadBatch(scope, slug);

		expect(batch.preparedById).toBe(preparedById);
		expect(batch.metadataCreatorId).toBe(scope.get(Security).userId);
	});

	test("accepts a record-only user as the preparer", async () => {
		const scope = await environment();
		const preparer = await scope.get(RepoAccess).createRecordOnlyUser({
			name: "Ada Example",
			email: "ada@example.com",
		});

		const slug = await createBatch(scope, { preparedById: preparer.id });

		expect((await loadBatch(scope, slug)).batch.preparedById).toBe(preparer.id);
	});

	test("rejects a batch without a name", async () => {
		const scope = await environment();
		const [args] = createMiddlewareArgs(scope, {
			request: post({
				name: "   ",
				preparationDate: "2025-01-15",
				preparedById: scope.get(Security).userId,
			}),
			params: { repo: "demo" },
		});

		expect(await newBatchAction(args)).not.toBeInstanceOf(Response);
	});

	test("rejects a preparation date that is not a calendar date", async () => {
		const scope = await environment();
		const [args] = createMiddlewareArgs(scope, {
			request: post({
				name: "Pt batch",
				preparationDate: "2025-02-30",
				preparedById: scope.get(Security).userId,
			}),
			params: { repo: "demo" },
		});

		await newBatchAction(args);

		expect(await scope.get(RepoDB).select().from(SampleBatch).all()).toEqual([]);
	});

	test("rejects a preparer who cannot open the repository", async () => {
		const scope = await environment();
		const outsider = await signUpTestUser(scope, { email: "outsider@example.com" });
		const [args] = createMiddlewareArgs(scope, {
			request: post({
				name: "Pt batch",
				preparationDate: "2025-01-15",
				preparedById: outsider,
			}),
			params: { repo: "demo" },
		});

		await newBatchAction(args);

		expect(await scope.get(RepoDB).select().from(SampleBatch).all()).toEqual([]);
	});
});

describe("$repo.samples.$batchSlug action", () => {
	test("adds a note through its own form operation", async () => {
		const scope = await environment();
		const batch = await insertBatchRecord(scope);

		const response = await submitBatch(scope, batch.slug, {
			addNote: "",
			body: "  The powder turned grey.  ",
		});

		expect(response).toBeInstanceOf(Response);
		expect((await scope.get(RepoDB).select().from(Note).get())?.body).toBe(
			"The powder turned grey.",
		);
	});

	test("adds uploaded files to a note", async () => {
		const scope = await environment();
		const batch = await insertBatchRecord(scope);
		const form = new FormData();
		form.set("addNote", "");
		form.set("body", "Two files");
		form.append("files", new File(["first"], "first.txt", { type: "text/plain" }));
		form.append("files", new File(["second"], "second.txt", { type: "text/plain" }));

		const response = await submitBatchForm(scope, batch.slug, form);

		expect(response).toBeInstanceOf(Response);
		expect(await scope.get(RepoDB).select().from(OriginalFile).all()).toHaveLength(2);
		expect(await scope.get(RepoDB).select().from(NoteAttachment).all()).toEqual([
			{ noteId: expect.any(Number), originalFileId: expect.any(Number), position: 0 },
			{ noteId: expect.any(Number), originalFileId: expect.any(Number), position: 1 },
		]);
	});

	test("discards uploaded files when an empty note is refused", async () => {
		const scope = await environment();
		const storage = scope.get(StorageEngine);
		const sources = scope.set(new TrackingUploadManager(storage, scope.get(RepoDB)));
		const batch = await insertBatchRecord(scope);
		const form = new FormData();
		form.set("addNote", "");
		form.set("body", "  ");
		form.append("files", new File(["photo"], "powder.jpg", { type: "image/jpeg" }));

		const response = await submitBatchForm(scope, batch.slug, form);
		if (response instanceof Response) throw new Error("Expected action data.");

		expect(response.data).toEqual({
			noteErrors: { body: "A note cannot be empty. Attach the files again." },
		});
		expect(await scope.get(RepoDB).select().from(OriginalFile).all()).toEqual([]);
		expect(await storage.exists(`uploads/${sources.pendingUpload!.id}/${sources.fileIds[0]}`)).toBe(
			false,
		);
	});

	test("answers 404 and discards files for a sample of another batch", async () => {
		const scope = await environment();
		const storage = scope.get(StorageEngine);
		const sources = scope.set(new TrackingUploadManager(storage, scope.get(RepoDB)));
		const slug = await createBatch(scope);
		const otherSlug = await createBatch(scope, { name: "Other batch" });
		await submitBatch(scope, otherSlug, { add: "", name: "#01" });
		const otherSample = (await scope.get(RepoDB).select().from(Sample).get())!;
		const form = new FormData();
		form.set("addNote", "");
		form.set("about", `sample:${otherSample.id}`);
		form.set("body", "Wrong batch");
		form.append("files", new File(["photo"], "powder.jpg", { type: "image/jpeg" }));

		const response = await submitBatchForm(scope, slug, form).then(
			() => undefined,
			(thrown: unknown) => thrown,
		);

		expect((response as Response).status).toBe(404);
		expect(await scope.get(RepoDB).select().from(Note).all()).toEqual([]);
		expect(await storage.exists(`uploads/${sources.pendingUpload!.id}/${sources.fileIds[0]}`)).toBe(
			false,
		);
	});

	test.each([["rig"], ["sample:abc"], ["sample:"]])(
		"answers 404 for the subject %p",
		async (about) => {
			const scope = await environment();
			const batch = await insertBatchRecord(scope);

			await expect(
				submitBatch(scope, batch.slug, { addNote: "", about, body: "A note" }),
			).rejects.toMatchObject({ status: 404 });
			expect(await scope.get(RepoDB).select().from(Note).all()).toEqual([]);
		},
	);

	test("a note about an archived sample cannot be edited or removed", async () => {
		const scope = await environment();
		const slug = await createBatch(scope);
		await submitBatch(scope, slug, { add: "", name: "#01" });
		const sample = (await scope.get(RepoDB).select().from(Sample).get())!;
		await submitBatch(scope, slug, {
			addNote: "",
			about: `sample:${sample.id}`,
			body: "Keep this note",
		});
		const note = (await scope.get(RepoDB).select().from(Note).get())!;
		await scope
			.get(RepoDB)
			.update(Sample)
			.set({ metadataArchivedAt: new Date() })
			.where(eq(Sample.id, sample.id))
			.run();

		await expect(
			submitBatch(scope, slug, { editNote: String(note.id), body: "Changed" }),
		).rejects.toMatchObject({ status: 404 });
		await expect(submitBatch(scope, slug, { archiveNote: String(note.id) })).rejects.toMatchObject({
			status: 404,
		});
		expect(await scope.get(RepoDB).select().from(Note).all()).toEqual([note]);
	});

	test("returns note errors separately from sample errors", async () => {
		const scope = await environment();
		const batch = await insertBatchRecord(scope);

		const response = await submitBatch(scope, batch.slug, { addNote: "", body: "  " });
		if (response instanceof Response) throw new Error("Expected action data.");

		expect(response.init?.status).toBe(400);
		expect(response.data).toEqual({ noteErrors: { body: "A note cannot be empty." } });
	});

	test("edits and removes a note through their form operations", async () => {
		const scope = await environment();
		const batch = await insertBatchRecord(scope);
		await submitBatch(scope, batch.slug, { addNote: "", body: "First version" });
		const original = (await scope.get(RepoDB).select().from(Note).get())!;

		await submitBatch(scope, batch.slug, {
			editNote: String(original.id),
			body: "Current version",
		});
		const current = (await scope.get(RepoDB).select().from(Note).all()).find(
			(note) => note.supersedesId === original.id,
		)!;
		await submitBatch(scope, batch.slug, { archiveNote: String(current.id) });

		expect(await scope.get(RepoDB).select().from(Note).all()).toHaveLength(2);
		expect(
			(await scope.get(RepoDB).select().from(Note).where(eq(Note.id, current.id)).get())
				?.metadataArchivedAt,
		).toBeInstanceOf(Date);
	});

	test("returns all add-form validation errors together", async () => {
		const scope = await environment();
		const batch = await insertBatchRecord(scope);
		const outsider = await signUpTestUser(scope, { email: "outsider@example.com" });

		const response = await submitBatch(scope, batch.slug, {
			add: "",
			name: " ",
			preparedById: outsider,
		});
		if (response instanceof Response) throw new Error("Expected action data.");

		expect(response.init?.status).toBe(400);
		expect(response.data).toEqual({
			errors: {
				name: "A sample name is required.",
				preparedById: "The selected preparer is not a user of this repository.",
			},
		});
		expect(await scope.get(RepoDB).select().from(Sample).all()).toEqual([]);
	});

	test("returns a form error for an unrecognized operation", async () => {
		const scope = await environment();
		const batch = await insertBatchRecord(scope);

		const response = await submitBatch(scope, batch.slug, {});
		if (response instanceof Response) throw new Error("Expected action data.");

		expect(response.init?.status).toBe(400);
		expect(response.data).toEqual({
			errors: { form: "The sample action is not recognized." },
		});
	});

	test("adds a sample and shows it through the loader", async () => {
		const scope = await environment();
		const slug = await createBatch(scope);

		await submitBatch(scope, slug, {
			add: "",
			name: "#01",
			preparedById: scope.get(Security).userId,
		});

		const { samples } = await loadBatch(scope, slug);

		expect(samples.map((sample) => sample.name)).toEqual(["#01"]);
	});

	test("takes the batch preparer when the form sends none", async () => {
		const scope = await environment();
		const slug = await createBatch(scope);

		await submitBatch(scope, slug, { add: "", name: "#01" });

		const { batch, samples } = await loadBatch(scope, slug);

		expect(samples[0]?.preparedById).toBe(batch.preparedById);
	});

	test("records the sample preparer separately from the record creator", async () => {
		const scope = await environment();
		const slug = await createBatch(scope);
		const preparedById = await signUpTestUser(scope, {
			name: "Zoe Researcher",
			email: "zoe.researcher@example.com",
		});
		await scope.get(RepoManager).grantAccess(preparedById, "demo");

		await submitBatch(scope, slug, { add: "", name: "#01", preparedById });

		expect((await loadBatch(scope, slug)).samples[0]?.preparedBy).toEqual({
			id: preparedById,
			name: "Zoe Researcher",
		});
		expect((await scope.get(RepoDB).select().from(Sample).get())?.metadataCreatorId).toBe(
			scope.get(Security).userId,
		);
	});

	test("numbers a generated slug shared by two different labels", async () => {
		const scope = await environment();
		const slug = await createBatch(scope);

		await submitBatch(scope, slug, { add: "", name: "#01" });
		await submitBatch(scope, slug, { add: "", name: "01" });

		const samples = await scope.get(RepoDB).select().from(Sample).all();
		expect(samples.map((sample) => [sample.name, sample.slug])).toEqual([
			["#01", "01"],
			["01", "01-2"],
		]);
	});

	test("rejects a duplicate label within the batch", async () => {
		const scope = await environment();
		const batch = await insertBatchRecord(scope);
		await submitBatch(scope, batch.slug, { add: "", name: "#01" });

		const response = await submitBatch(scope, batch.slug, { add: "", name: "#01" });

		if (response instanceof Response || typeof response === "string") {
			throw new Error("Expected action data.");
		}

		expect(response.init?.status).toBe(400);
		expect(response.data).toEqual({
			errors: { name: 'This batch already contains a sample named "#01".' },
		});
		expect((await loadBatch(scope, batch.slug)).samples).toHaveLength(1);
	});

	test("reports when five generated sample slugs are already in use", async () => {
		const scope = await environment();
		const db = scope.get(RepoDB);
		const userId = scope.get(Security).userId;
		const createdAt = new Date("2026-01-15T12:00:00.000Z");
		const batch = await insertBatchRecord(scope);

		for (let attempt = 1; attempt <= 5; attempt++) {
			const id = id53();
			await db.insert(Id).values({ id }).run();
			await db
				.insert(Sample)
				.values({
					id,
					batchId: batch.id,
					slug: attempt === 1 ? "01" : `01-${attempt}`,
					name: `existing-${attempt}`,
					preparedById: userId,
					metadataCreatorId: userId,
					metadataCreationTimestamp: createdAt,
				})
				.run();
		}

		const lines: string[] = [];
		const stream = new Writable({
			write(chunk, _encoding, done) {
				lines.push(String(chunk).trimEnd());
				done();
			},
		});
		scope.set(new Logger({ level: LOG_LEVEL.ERROR, stream }));

		const response = await submitBatch(scope, batch.slug, { add: "", name: "01" });
		if (response instanceof Response || typeof response === "string") {
			throw new Error("Expected action data.");
		}

		expect(response.init?.status).toBe(400);
		expect(response.data).toEqual({
			errors: {
				name: "A URL identifier could not be created for this sample. Choose a name that differs by more than punctuation.",
			},
		});
		expect(JSON.parse(lines[0])).toMatchObject({
			level: "ERROR",
			event: "sample_slug_allocation_failed",
			repository: "demo",
			batchId: batch.id,
			sampleName: "01",
			baseSlug: "01",
			attempts: 5,
		});
	});

	test("keeps the label of an archived sample reserved", async () => {
		const scope = await environment();
		const slug = await createBatch(scope);
		await submitBatch(scope, slug, { add: "", name: "#01" });

		await scope
			.get(RepoDB)
			.update(Sample)
			.set({ metadataArchivedAt: new Date() })
			.where(eq(Sample.name, "#01"))
			.run();

		const loaded = await loadBatch(scope, slug);
		const response = await submitBatch(scope, slug, { add: "", name: "#01" });

		// The loader includes the archived sample so its label can inform the next
		// suggestion. The label also remains unavailable to the action.
		expect(loaded.samples[0]?.metadataArchivedAt).toBeInstanceOf(Date);
		expect(response).not.toBeInstanceOf(Response);
	});

	test("deletes a sample", async () => {
		const scope = await environment();
		const slug = await createBatch(scope);
		await submitBatch(scope, slug, { add: "", name: "#01" });
		const [sample] = await scope.get(RepoDB).select().from(Sample).all();

		const response = await submitBatch(scope, slug, { delete: String(sample.id) });

		expect(response).toBeInstanceOf(Response);
		expect((await loadBatch(scope, slug)).samples).toEqual([]);
	});

	test("refuses to delete a sample that has notes", async () => {
		const scope = await environment();
		const slug = await createBatch(scope);
		await submitBatch(scope, slug, { add: "", name: "#01" });
		const sample = (await scope.get(RepoDB).select().from(Sample).get())!;
		await submitBatch(scope, slug, {
			addNote: "",
			about: `sample:${sample.id}`,
			body: "The sample has changed colour.",
		});

		const response = await submitBatch(scope, slug, { delete: String(sample.id) });
		if (response instanceof Response) throw new Error("Expected action data.");

		expect(response.init?.status).toBe(400);
		expect(response.data).toEqual({
			errors: {
				form: "This sample has notes, so it cannot be deleted. Archive it instead.",
			},
		});
		expect((await scope.get(RepoDB).select().from(Sample).get())?.id).toBe(sample.id);
	});

	test("answers 404 for a sample that is not there", async () => {
		const scope = await environment();
		const slug = await createBatch(scope);

		await expect(submitBatch(scope, slug, { delete: "999999" })).rejects.toMatchObject({
			status: 404,
		});
	});

	test("answers 404 for a batch that is not there", async () => {
		const scope = await environment();

		await expect(
			submitBatch(scope, "no-such-batch", { add: "", name: "#01" }),
		).rejects.toMatchObject({
			status: 404,
		});
	});
});

describe("$repo.samples.$batchSlug archived batch", () => {
	test("the page opens and reports that the batch is archived", async () => {
		const scope = await environment();
		const batch = await insertBatchRecord(scope);
		await archive(scope, batch.slug);

		const loaded = await loadBatch(scope, batch.slug);

		expect(loaded.batch.name).toBe("Pt batch");
		expect(loaded.archived).toBe(true);
	});

	test("an active batch is not reported as archived", async () => {
		const scope = await environment();
		const batch = await insertBatchRecord(scope);

		expect((await loadBatch(scope, batch.slug)).archived).toBe(false);
	});

	test("a sample cannot be added to an archived batch", async () => {
		const scope = await environment();
		const batch = await insertBatchRecord(scope);
		await archive(scope, batch.slug);

		await expect(submitBatch(scope, batch.slug, { add: "", name: "#01" })).rejects.toMatchObject({
			status: 404,
		});
	});

	test("notes cannot be added, edited, or removed from an archived batch", async () => {
		const scope = await environment();
		const batch = await insertBatchRecord(scope);
		await submitBatch(scope, batch.slug, { addNote: "", body: "A note" });
		const note = (await scope.get(RepoDB).select().from(Note).get())!;
		await archive(scope, batch.slug);

		const changes: Record<string, string>[] = [
			{ addNote: "", body: "Another note" },
			{ editNote: String(note.id), body: "Changed" },
			{ archiveNote: String(note.id) },
		];

		for (const fields of changes) {
			expect(submitBatch(scope, batch.slug, fields)).rejects.toMatchObject({ status: 404 });
		}

		expect(await scope.get(RepoDB).select().from(Note).all()).toEqual([note]);
	});
});

async function archive(scope: ServiceContainer, slug: string) {
	await scope
		.get(RepoDB)
		.update(SampleBatch)
		.set({ metadataArchivedAt: new Date() })
		.where(eq(SampleBatch.slug, slug))
		.run();
}

/**
 * Submit the edit page. Every field it shows is sent, the way a browser does.
 */
async function editBatch(
	scope: ServiceContainer,
	batchSlug: string,
	fields: Record<string, string> = {},
) {
	const request = post({
		name: "Pt batch",
		preparationDate: "2026-01-15",
		preparedById: scope.get(Security).userId,
		activeMaterial: "",
		support: "",
		...fields,
	});
	const [args] = createMiddlewareArgs(scope, {
		request,
		params: { repo: "demo", batchSlug },
	});

	return editBatchAction(args);
}

async function loadEditBatch(scope: ServiceContainer, batchSlug: string) {
	const [args] = createMiddlewareArgs(scope, { params: { repo: "demo", batchSlug } });

	return editBatchLoader(args);
}

describe("$repo.samples.$batchSlug edit loader", () => {
	test("returns the batch and the people who may prepare it", async () => {
		const scope = await environment();
		const batch = await insertBatchRecord(scope);

		const loaded = await loadEditBatch(scope, batch.slug);

		expect(loaded.batch).toMatchObject({ name: "Pt batch", preparationDate: "2026-01-15" });
		expect(loaded.preparers.length).toBeGreaterThan(0);
	});

	test("answers 404 for a batch that is not there", async () => {
		const scope = await environment();

		await expect(loadEditBatch(scope, "no-such-batch")).rejects.toMatchObject({ status: 404 });
	});

	test("answers 404 for an archived batch", async () => {
		const scope = await environment();
		const batch = await insertBatchRecord(scope);
		await archive(scope, batch.slug);

		await expect(loadEditBatch(scope, batch.slug)).rejects.toMatchObject({ status: 404 });
	});
});

describe("$repo.samples.$batchSlug edit action", () => {
	test("stores the new values and returns to the batch page", async () => {
		const scope = await environment();
		const batch = await insertBatchRecord(scope);

		const response = await editBatch(scope, batch.slug, {
			name: "Pd batch",
			preparationDate: "2026-03-02",
			activeMaterial: "Pd",
			support: "Al2O3",
		});

		expect(response).toBeInstanceOf(Response);

		const stored = await scope.get(RepoDB).select().from(SampleBatch).get();
		expect(stored).toMatchObject({
			name: "Pd batch",
			preparationDate: "2026-03-02",
			activeMaterial: "Pd",
			support: "Al2O3",
		});
	});

	test("keeps the slug when the name changes, so old links still work", async () => {
		const scope = await environment();
		const batch = await insertBatchRecord(scope);

		await editBatch(scope, batch.slug, { name: "A completely different name" });

		expect((await scope.get(RepoDB).select().from(SampleBatch).get())?.slug).toBe(batch.slug);
	});

	test("an empty active material is stored as no value", async () => {
		const scope = await environment();
		const batch = await insertBatchRecord(scope);
		await editBatch(scope, batch.slug, { activeMaterial: "Pt" });

		await editBatch(scope, batch.slug, { activeMaterial: "" });

		expect((await scope.get(RepoDB).select().from(SampleBatch).get())?.activeMaterial).toBeNull();
	});

	test("refuses an empty name", async () => {
		const scope = await environment();
		const batch = await insertBatchRecord(scope);

		const response = await editBatch(scope, batch.slug, { name: "" });

		expect(response).toMatchObject({ init: { status: 400 } });
		expect((await scope.get(RepoDB).select().from(SampleBatch).get())?.name).toBe("Pt batch");
	});

	test("refuses a date that is not a calendar date", async () => {
		const scope = await environment();
		const batch = await insertBatchRecord(scope);

		const response = await editBatch(scope, batch.slug, { preparationDate: "2026-02-31" });

		expect(response).toMatchObject({ init: { status: 400 } });
	});

	test("refuses a preparer who cannot open the repository", async () => {
		const scope = await environment();
		const batch = await insertBatchRecord(scope);

		const response = await editBatch(scope, batch.slug, { preparedById: "someone-else" });

		expect(response).toMatchObject({ init: { status: 400 } });
	});

	test("answers 404 for an archived batch", async () => {
		const scope = await environment();
		const batch = await insertBatchRecord(scope);
		await archive(scope, batch.slug);

		await expect(editBatch(scope, batch.slug)).rejects.toMatchObject({ status: 404 });
	});
});
