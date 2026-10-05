import { describe, expect, test } from "bun:test";

import { eq } from "drizzle-orm";

import type { BatchStatements } from "~/app/services/DatabaseManager.ts";
import { NoteManager, NoteNotFoundError, type NoteInput } from "~/app/services/NoteManager.ts";
import { RepoDB } from "~/app/services/RepoDB.ts";
import { Security } from "~/app/services/Security.ts";
import { UploadManager } from "~/app/services/UploadManager.ts";
import { setupTestRepositoryEnvironment } from "~/app/testUtils/testUtils.ts";
import { Id } from "~/drizzle/schema/repo.Id.ts";
import { InventoryEntry } from "~/drizzle/schema/repo.InventoryEntry.ts";
import { Note } from "~/drizzle/schema/repo.Note.ts";
import { NoteAttachment } from "~/drizzle/schema/repo.NoteAttachment.ts";
import { OriginalFile } from "~/drizzle/schema/repo.OriginalFile.ts";
import { Sample } from "~/drizzle/schema/repo.Sample.ts";
import { SampleBatch } from "~/drizzle/schema/repo.SampleBatch.ts";
import { id53 } from "~/lib/id53/id53.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";

/**
 * An ID that no note has.
 */
const MISSING_NOTE_ID = 1234567890123;

function input(fields: Partial<NoteInput>): NoteInput {
	return { body: "", ...fields };
}

/**
 * Returns a new ID with its row in Id. A batch, a sample, or a rig uses it as
 * its primary key.
 */
async function newId(db: RepoDB): Promise<number> {
	const id = id53();
	await db.insert(Id).values({ id }).run();

	return id;
}

async function stageUpload(scope: ServiceContainer, names: readonly string[]) {
	const upload = scope.get(UploadManager).beginUpload();

	for (const name of names) {
		await upload.add({
			originalName: name,
			mediaType: "text/plain",
			source: new Blob([name]).stream(),
		});
	}

	return upload;
}

async function environment() {
	const scope = await setupTestRepositoryEnvironment("demo");
	const db = scope.get(RepoDB);
	const notes = scope.get(NoteManager);
	const creatorId = scope.get(Security).userId;
	const batch = await db
		.insert(SampleBatch)
		.values({
			id: await newId(db),
			slug: "pt-batch",
			name: "Pt batch",
			preparationDate: "2026-01-15",
			preparedById: creatorId,
			metadataCreatorId: creatorId,
			metadataCreationTimestamp: new Date("2026-01-15T12:00:00.000Z"),
		})
		.returning()
		.get();

	return { scope, db, notes, creatorId, batch };
}

describe("NoteManager", () => {
	test("about returns no notes without storing a file", async () => {
		const { db, notes, batch } = await environment();

		expect(await notes.about([batch.id])).toEqual([]);
		expect(await db.select().from(OriginalFile).all()).toEqual([]);
	});

	test("add discards a staged file when it refuses a note", async () => {
		const { scope, db, notes, batch } = await environment();
		const upload = await stageUpload(scope, ["refused-add.txt"]);

		const errors = await notes.add(batch.id, input({ body: "  " }), upload);

		expect(errors).toEqual({
			body: "A note cannot be empty. Attach the files again.",
		});
		expect(await db.select().from(OriginalFile).all()).toEqual([]);
	});

	test("edit discards a staged file when it refuses a note", async () => {
		const { scope, db, notes, batch } = await environment();
		const upload = await stageUpload(scope, ["refused-edit.txt"]);

		expect(
			notes.edit(MISSING_NOTE_ID, [batch.id], input({ body: "Changed" }), upload),
		).rejects.toBeInstanceOf(NoteNotFoundError);
		expect(await db.select().from(OriginalFile).all()).toEqual([]);
	});

	test("archive refuses a missing note without storing a file", async () => {
		const { db, notes, batch } = await environment();

		await expect(notes.archive(MISSING_NOTE_ID, [batch.id])).rejects.toThrow(NoteNotFoundError);
		expect(await db.select().from(OriginalFile).all()).toEqual([]);
	});

	test("adding a note writes its attachments in order", async () => {
		const { scope, db, notes, batch } = await environment();
		const upload = await stageUpload(scope, ["first.txt", "second.txt"]);

		await notes.add(batch.id, input({ body: "Files attached" }), upload);
		const [first, second] = await db.select().from(OriginalFile).all();

		expect(await db.select().from(NoteAttachment).all()).toEqual([
			{ noteId: expect.any(Number), originalFileId: first!.id, position: 0 },
			{ noteId: expect.any(Number), originalFileId: second!.id, position: 1 },
		]);
	});

	test("editing only the text copies the attachments to the new version", async () => {
		const { scope, db, notes, batch } = await environment();
		const upload = await stageUpload(scope, ["copied.txt"]);
		await notes.add(batch.id, input({ body: "First version" }), upload);
		const original = (await db.select().from(Note).get())!;
		const file = (await db.select().from(OriginalFile).get())!;

		await notes.edit(original.id, [batch.id], input({ body: "Second version" }));
		const current = (await db.select().from(Note).all()).find(
			(note) => note.supersedesId === original.id,
		)!;

		expect(await db.select().from(NoteAttachment).all()).toEqual([
			{ noteId: original.id, originalFileId: file.id, position: 0 },
			{ noteId: current.id, originalFileId: file.id, position: 0 },
		]);
	});

	test("adding a file writes a new version with the old and new files", async () => {
		const { scope, db, notes, batch } = await environment();
		await notes.add(
			batch.id,
			input({ body: "Same text" }),
			await stageUpload(scope, ["old-file.txt"]),
		);
		const original = (await db.select().from(Note).get())!;

		await notes.edit(
			original.id,
			[batch.id],
			input({ body: "Same text" }),
			await stageUpload(scope, ["new-file.txt"]),
		);
		const [oldFile, newFile] = await db.select().from(OriginalFile).all();
		const current = (await db.select().from(Note).all()).find(
			(note) => note.supersedesId === original.id,
		)!;

		expect(
			await db
				.select()
				.from(NoteAttachment)
				.where(eq(NoteAttachment.noteId, current.id))
				.orderBy(NoteAttachment.position)
				.all(),
		).toEqual([
			{ noteId: current.id, originalFileId: oldFile!.id, position: 0 },
			{ noteId: current.id, originalFileId: newFile!.id, position: 1 },
		]);
	});

	test("removing a file writes a new version without changing the file record", async () => {
		const { scope, db, notes, batch } = await environment();
		await notes.add(
			batch.id,
			input({ body: "Files" }),
			await stageUpload(scope, ["removed-file.txt", "kept-file.txt"]),
		);
		const original = (await db.select().from(Note).get())!;
		const [removedFile, keptFile] = await db.select().from(OriginalFile).all();

		await notes.edit(original.id, [batch.id], input({ body: "Files" }), undefined, [
			removedFile!.id,
		]);
		const current = (await db.select().from(Note).all()).find(
			(note) => note.supersedesId === original.id,
		)!;

		expect(
			await db.select().from(NoteAttachment).where(eq(NoteAttachment.noteId, current.id)).all(),
		).toEqual([{ noteId: current.id, originalFileId: keptFile!.id, position: 0 }]);
		expect(await db.select().from(OriginalFile).all()).toHaveLength(2);
	});

	test("an older version keeps a file removed from a newer version", async () => {
		const { scope, db, notes, batch } = await environment();
		await notes.add(
			batch.id,
			input({ body: "Files" }),
			await stageUpload(scope, ["historical.txt"]),
		);
		const original = (await db.select().from(Note).get())!;
		const file = (await db.select().from(OriginalFile).get())!;

		await notes.edit(original.id, [batch.id], input({ body: "Files" }), undefined, [file.id]);

		expect(
			await db.select().from(NoteAttachment).where(eq(NoteAttachment.noteId, original.id)).all(),
		).toEqual([{ noteId: original.id, originalFileId: file.id, position: 0 }]);
	});

	test("a failed note write leaves a successfully uploaded file in place", async () => {
		const { scope, db, batch } = await environment();
		const upload = scope.get(UploadManager).beginUpload();
		const fileId = await upload.add({
			originalName: "survives.txt",
			mediaType: "text/plain",
			source: new Blob(["survives"]).stream(),
		});
		const failingDb = new Proxy(db, {
			get(target, property) {
				if (property === "batch") {
					return () => {
						throw new Error("Note write failed");
					};
				}

				const value: unknown = Reflect.get(target, property, target);
				return typeof value === "function" ? value.bind(target) : value;
			},
		}) as RepoDB;

		const notes = scope.set(
			new NoteManager(failingDb, scope.get(UploadManager), scope.get(Security)),
		);

		await expect(notes.add(batch.id, input({ body: "This write fails" }), upload)).rejects.toThrow(
			"Note write failed",
		);
		expect((await scope.get(UploadManager).getFile(fileId)).originalName).toBe("survives.txt");
		expect(await db.select().from(OriginalFile).all()).toHaveLength(1);
	});

	test("adding stores the trimmed text", async () => {
		const { db, notes, batch } = await environment();

		await notes.add(batch.id, input({ body: "  First line.\nSecond line.  " }));

		expect((await db.select().from(Note).get())?.body).toBe("First line.\nSecond line.");
	});

	test("editing a rig note keeps an unchanged observed time", async () => {
		const { db, notes, creatorId } = await environment();
		const rig = await db
			.insert(InventoryEntry)
			.values({
				id: await newId(db),
				slug: "edited-rig",
				name: "Edited rig",
				kind: "rig",
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: new Date(),
			})
			.returning()
			.get();
		const observedAt = new Date("2026-02-03T14:32:00.123Z");
		await notes.add(rig.id, input({ body: "Pressure dropped.", observedAt }));
		const original = (await db.select().from(Note).get())!;
		const storedObservedAt = original.observedAt!;

		await notes.edit(
			original.id,
			[rig.id],
			input({ body: "Pressure dropped briefly.", observedAt: storedObservedAt }),
		);

		expect(await db.select().from(Note).all()).toContainEqual(
			expect.objectContaining({
				supersedesId: original.id,
				noteSubjectId: rig.id,
				observedAt: storedObservedAt,
			}),
		);
	});

	test("an edit without an observed time keeps the time of the version it replaces", async () => {
		const { db, notes, batch } = await environment();
		const observedAt = new Date("2026-02-03T14:32:00.000Z");
		await notes.add(batch.id, { body: "First version", observedAt });
		const original = (await db.select().from(Note).get())!;

		await notes.edit(original.id, [batch.id], { body: "Second version" });

		expect(await db.select().from(Note).all()).toContainEqual(
			expect.objectContaining({ supersedesId: original.id, observedAt }),
		);
	});

	test.each([[""], ["  \n\t  "]])("adding refuses empty text %p", async (body) => {
		const { db, notes, batch } = await environment();

		const errors = await notes.add(batch.id, input({ body }));

		expect(errors).toEqual({ body: "A note cannot be empty." });
		expect(await db.select().from(Note).all()).toEqual([]);
	});

	test("editing a sample note keeps the sample as its subject", async () => {
		const { db, notes, creatorId, batch } = await environment();
		const sample = await db
			.insert(Sample)
			.values({
				id: await newId(db),
				batchId: batch.id,
				slug: "02",
				name: "#02",
				preparedById: creatorId,
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: new Date(),
			})
			.returning()
			.get();
		await notes.add(sample.id, input({ body: "First version" }));
		const original = (await db.select().from(Note).get())!;

		await notes.edit(original.id, [batch.id, sample.id], input({ body: "Second version" }));

		expect(await db.select().from(Note).all()).toContainEqual(
			expect.objectContaining({ supersedesId: original.id, noteSubjectId: sample.id }),
		);
	});

	test("about returns the notes of every subject with the given sample names", async () => {
		const { db, notes, creatorId, batch } = await environment();
		const sample = await db
			.insert(Sample)
			.values({
				id: await newId(db),
				batchId: batch.id,
				slug: "03",
				name: "#03",
				preparedById: creatorId,
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: new Date(),
			})
			.returning()
			.get();
		await notes.add(batch.id, input({ body: "About the batch" }));
		await notes.add(sample.id, input({ body: "About #03" }));

		const shown = await notes.about([batch.id, sample.id], {
			samples: new Map([[sample.id, { name: "#03", archived: true }]]),
		});

		expect(shown.find((note) => note.body === "About the batch")).not.toHaveProperty("sampleName");
		expect(shown.find((note) => note.body === "About #03")).toMatchObject({
			sampleName: "#03",
			sampleArchived: true,
		});
	});

	test("a note about a subject outside the given subjects cannot be changed", async () => {
		const { db, notes, creatorId, batch } = await environment();
		const sample = await db
			.insert(Sample)
			.values({
				id: await newId(db),
				batchId: batch.id,
				slug: "archived-sample",
				name: "Archived sample",
				preparedById: creatorId,
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: new Date(),
			})
			.returning()
			.get();
		await notes.add(sample.id, input({ body: "Keep this note" }));
		const note = (await db.select().from(Note).get())!;
		await db
			.update(Sample)
			.set({ metadataArchivedAt: new Date() })
			.where(eq(Sample.id, sample.id))
			.run();

		// The batch page leaves an archived sample out of the subjects it changes.
		await expect(
			notes.edit(note.id, [batch.id], input({ body: "Changed" })),
		).rejects.toBeInstanceOf(NoteNotFoundError);
		await expect(notes.archive(note.id, [batch.id])).rejects.toThrow(NoteNotFoundError);
	});

	test("editing writes a new row and leaves the old row unchanged", async () => {
		const { db, notes, batch } = await environment();
		await notes.add(batch.id, input({ body: "Powder is grey." }));
		const original = (await db.select().from(Note).get())!;

		await notes.edit(original.id, [batch.id], input({ body: "Powder is light grey." }));

		const [storedOriginal, edit] = await db.select().from(Note).all();
		expect(storedOriginal).toEqual(original);
		expect(edit).toEqual(
			expect.objectContaining({
				body: "Powder is light grey.",
				supersedesId: original.id,
			}),
		);
	});

	test("editing a version that is not current is refused", async () => {
		const { db, notes, batch } = await environment();
		await notes.add(batch.id, input({ body: "First version" }));
		const original = (await db.select().from(Note).get())!;
		await notes.edit(original.id, [batch.id], input({ body: "Second version" }));

		expect(
			notes.edit(original.id, [batch.id], input({ body: "Another edit" })),
		).rejects.toBeInstanceOf(NoteNotFoundError);
		expect(await db.select().from(Note).all()).toHaveLength(2);
	});

	test("the second of two edits reports that the note changed", async () => {
		const { scope, db, notes, creatorId, batch } = await environment();
		await notes.add(batch.id, input({ body: "First version" }));
		const original = (await db.select().from(Note).get())!;
		let competingEditInserted = false;

		const racingDb = new Proxy(db, {
			get(target, property) {
				if (property === "batch") {
					return async (statements: BatchStatements) => {
						if (!competingEditInserted) {
							competingEditInserted = true;
							await db
								.insert(Note)
								.values({
									id: id53(),
									noteSubjectId: batch.id,
									body: "Competing edit",
									observedAt: null,
									supersedesId: original.id,
									metadataCreatorId: creatorId,
									metadataCreationTimestamp: new Date(),
								})
								.run();
						}

						return await db.batch(statements);
					};
				}

				const value: unknown = Reflect.get(target, property, target);
				return typeof value === "function" ? value.bind(target) : value;
			},
		}) as RepoDB;

		const racingNotes = scope.set(
			new NoteManager(racingDb, scope.get(UploadManager), scope.get(Security)),
		);
		const errors = await racingNotes.edit(original.id, [batch.id], input({ body: "Late edit" }));

		expect(errors).toEqual({
			form: "Someone else changed this note. Reload the page to see the latest text.",
		});
		expect(await db.select().from(Note).all()).toHaveLength(2);
	});

	test("removing archives the current version and deletes nothing", async () => {
		const { db, notes, batch } = await environment();
		await notes.add(batch.id, input({ body: "First version" }));
		const original = (await db.select().from(Note).get())!;
		await notes.edit(original.id, [batch.id], input({ body: "Current version" }));
		const current = (await db.select().from(Note).all()).find(
			(note) => note.supersedesId === original.id,
		)!;

		await notes.archive(current.id, [batch.id]);

		const stored = await db.select().from(Note).all();
		expect(stored).toHaveLength(2);
		expect(stored.find((note) => note.id === original.id)?.metadataArchivedAt).toBeNull();
		expect(stored.find((note) => note.id === current.id)?.metadataArchivedAt).toBeInstanceOf(Date);
	});

	test("a note from another batch cannot be edited or removed", async () => {
		const { db, notes, creatorId, batch } = await environment();
		const otherBatch = await db
			.insert(SampleBatch)
			.values({
				id: await newId(db),
				slug: "other-batch",
				name: "Other batch",
				preparationDate: "2026-01-16",
				preparedById: creatorId,
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: new Date("2026-01-16T12:00:00.000Z"),
			})
			.returning()
			.get();
		await notes.add(otherBatch.id, input({ body: "Other note" }));
		const note = (await db.select().from(Note).get())!;

		expect(notes.edit(note.id, [batch.id], input({ body: "Changed" }))).rejects.toBeInstanceOf(
			NoteNotFoundError,
		);
		await expect(notes.archive(note.id, [batch.id])).rejects.toThrow(NoteNotFoundError);
	});

	test("a removed note cannot be edited or removed again", async () => {
		const { db, notes, batch } = await environment();
		await notes.add(batch.id, input({ body: "A note" }));
		const note = (await db.select().from(Note).get())!;
		await notes.archive(note.id, [batch.id]);

		expect(notes.edit(note.id, [batch.id], input({ body: "Changed" }))).rejects.toBeInstanceOf(
			NoteNotFoundError,
		);
		await expect(notes.archive(note.id, [batch.id])).rejects.toThrow(NoteNotFoundError);
	});
});
