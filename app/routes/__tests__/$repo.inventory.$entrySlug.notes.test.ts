import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";

import { action, loader } from "~/app/routes/$repo.inventory.$entrySlug.notes.tsx";
import { RepoDB } from "~/app/services/RepoDB.ts";
import { Security } from "~/app/services/Security.ts";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { setupTestRepositoryEnvironment } from "~/app/testUtils/testUtils.ts";
import { Id } from "~/drizzle/schema/repo.Id.ts";
import { InventoryEntry } from "~/drizzle/schema/repo.InventoryEntry.ts";
import { Note } from "~/drizzle/schema/repo.Note.ts";
import { OriginalFile } from "~/drizzle/schema/repo.OriginalFile.ts";
import { Env } from "~/lib/env/Env.ts";
import { id53 } from "~/lib/id53/id53.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";

/**
 * Returns a new ID with its row in Id. A rig uses it as its primary key.
 */
async function newId(db: RepoDB): Promise<number> {
	const id = id53();
	await db.insert(Id).values({ id }).run();

	return id;
}

/**
 * Returns the paths of every stored file, staged files included.
 */
function storedFiles(scope: ServiceContainer): string[] {
	const directory = scope.get(Env).string("ADACTA_STORAGE_DIR");

	return readdirSync(directory, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name);
}

describe("rig notes route", () => {
	test("responds with 404 for an entry that is not a rig", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const creatorId = scope.get(Security).userId;
		await scope
			.get(RepoDB)
			.insert(InventoryEntry)
			.values({
				id: await newId(scope.get(RepoDB)),
				slug: "balance",
				name: "Balance",
				kind: "equipment",
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: new Date(),
			})
			.run();
		const [args] = createMiddlewareArgs(scope, {
			request: new Request("http://localhost/demo/inventory/balance/notes"),
			params: { repo: "demo", entrySlug: "balance" },
		});

		const response = await loader(args).then(
			() => undefined,
			(thrown: unknown) => thrown,
		);

		expect(response).toBeInstanceOf(Response);
		expect((response as Response).status).toBe(404);
	});

	test("adds a note to a rig", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const creatorId = scope.get(Security).userId;
		const rig = await scope
			.get(RepoDB)
			.insert(InventoryEntry)
			.values({
				id: await newId(scope.get(RepoDB)),
				slug: "test-rig",
				name: "Test rig",
				kind: "rig",
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: new Date(),
			})
			.returning()
			.get();
		const form = new FormData();
		form.set("addNote", "");
		form.set("body", "Flow became unstable.");
		form.set("observedAt", "2026-09-21T14:32:00.000Z");
		const [args] = createMiddlewareArgs(scope, {
			request: new Request("http://localhost/demo/inventory/test-rig/notes", {
				method: "POST",
				body: form,
			}),
			params: { repo: "demo", entrySlug: "test-rig" },
		});

		const response = await action(args);

		expect(response).toBeInstanceOf(Response);
		expect(await scope.get(RepoDB).select().from(Note).get()).toMatchObject({
			noteSubjectId: rig.id,
			body: "Flow became unstable.",
		});
	});

	test("refuses a new note with an invalid observed time and discards its files", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const creatorId = scope.get(Security).userId;
		const db = scope.get(RepoDB);
		await db
			.insert(InventoryEntry)
			.values({
				id: await newId(db),
				slug: "zone-rig",
				name: "Zone rig",
				kind: "rig",
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: new Date(),
			})
			.run();
		const form = new FormData();
		form.set("addNote", "");
		form.set("body", "Pressure dropped.");
		form.set("observedAt", "2026-09-21T14:32:00");
		form.append("files", new File(["photo"], "pressure.jpg", { type: "image/jpeg" }));
		const [args] = createMiddlewareArgs(scope, {
			request: new Request("http://localhost/demo/inventory/zone-rig/notes", {
				method: "POST",
				body: form,
			}),
			params: { repo: "demo", entrySlug: "zone-rig" },
		});

		const response = await action(args);
		if (response instanceof Response) throw new Error("Expected action data.");

		expect(response.data).toEqual({
			noteErrors: { observedAt: "Enter a valid observed time. Attach the files again." },
		});
		expect(await db.select().from(Note).all()).toEqual([]);
		expect(storedFiles(scope)).toEqual([]);
	});

	test("discards files when an edit has an invalid observed time", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const creatorId = scope.get(Security).userId;
		const db = scope.get(RepoDB);
		const rig = await db
			.insert(InventoryEntry)
			.values({
				id: await newId(scope.get(RepoDB)),
				slug: "invalid-time-rig",
				name: "Invalid time rig",
				kind: "rig",
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: new Date(),
			})
			.returning()
			.get();
		const note = await db
			.insert(Note)
			.values({
				id: id53(),
				noteSubjectId: rig.id,
				body: "Pressure dropped.",
				observedAt: new Date("2026-09-21T12:32:00.000Z"),
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: new Date(),
			})
			.returning()
			.get();
		const form = new FormData();
		form.set("editNote", String(note.id));
		form.set("body", "Pressure dropped briefly.");
		form.set("observedAt", "2026-09-21T14:32:00");
		form.append("files", new File(["photo"], "pressure.jpg", { type: "image/jpeg" }));
		const [args] = createMiddlewareArgs(scope, {
			request: new Request("http://localhost/demo/inventory/invalid-time-rig/notes", {
				method: "POST",
				body: form,
			}),
			params: { repo: "demo", entrySlug: rig.slug },
		});

		const response = await action(args);
		if (response instanceof Response) throw new Error("Expected action data.");

		expect(response.data).toEqual({
			noteErrors: { observedAt: "Enter a valid observed time. Attach the files again." },
		});
		expect(await db.select().from(OriginalFile).all()).toEqual([]);
	});

	test("discards files when the edited note is no longer current", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const creatorId = scope.get(Security).userId;
		const db = scope.get(RepoDB);
		const rig = await db
			.insert(InventoryEntry)
			.values({
				id: await newId(scope.get(RepoDB)),
				slug: "current-note-rig",
				name: "Current note rig",
				kind: "rig",
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: new Date(),
			})
			.returning()
			.get();
		const oldNoteId = id53();
		await db
			.insert(Note)
			.values([
				{
					id: oldNoteId,
					noteSubjectId: rig.id,
					body: "First version",
					observedAt: new Date("2026-09-21T12:32:00.000Z"),
					metadataCreatorId: creatorId,
					metadataCreationTimestamp: new Date(),
				},
				{
					id: id53(),
					noteSubjectId: rig.id,
					body: "Current version",
					observedAt: new Date("2026-09-21T12:32:00.000Z"),
					supersedesId: oldNoteId,
					metadataCreatorId: creatorId,
					metadataCreationTimestamp: new Date(),
				},
			])
			.run();
		const form = new FormData();
		form.set("editNote", String(oldNoteId));
		form.set("body", "Late edit");
		form.set("observedAt", "2026-09-21T12:32:00.000Z");
		form.append("files", new File(["photo"], "pressure.jpg", { type: "image/jpeg" }));
		const [args] = createMiddlewareArgs(scope, {
			request: new Request("http://localhost/demo/inventory/current-note-rig/notes", {
				method: "POST",
				body: form,
			}),
			params: { repo: "demo", entrySlug: rig.slug },
		});

		const response = await action(args).then(
			() => undefined,
			(thrown: unknown) => thrown,
		);

		expect(response).toBeInstanceOf(Response);
		expect((response as Response).status).toBe(404);
		expect(await db.select().from(OriginalFile).all()).toEqual([]);
	});

	test.each([["editNote"], ["archiveNote"]])(
		"answers 404 and discards files for an invalid ID in %p",
		async (field) => {
			const scope = await setupTestRepositoryEnvironment("demo");
			const creatorId = scope.get(Security).userId;
			await scope
				.get(RepoDB)
				.insert(InventoryEntry)
				.values({
					id: await newId(scope.get(RepoDB)),
					slug: "invalid-id-rig",
					name: "Invalid ID rig",
					kind: "rig",
					metadataCreatorId: creatorId,
					metadataCreationTimestamp: new Date(),
				})
				.run();
			const form = new FormData();
			form.set(field, "abc");
			form.set("body", "Changed");
			form.set("observedAt", "2026-09-21T12:32:00.000Z");
			form.append("files", new File(["photo"], "pressure.jpg", { type: "image/jpeg" }));
			const [args] = createMiddlewareArgs(scope, {
				request: new Request("http://localhost/demo/inventory/invalid-id-rig/notes", {
					method: "POST",
					body: form,
				}),
				params: { repo: "demo", entrySlug: "invalid-id-rig" },
			});

			const response = await action(args).then(
				() => undefined,
				(thrown: unknown) => thrown,
			);

			expect(response).toBeInstanceOf(Response);
			expect((response as Response).status).toBe(404);
			expect(storedFiles(scope)).toEqual([]);
		},
	);

	test("lists rig notes by observed time", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const creatorId = scope.get(Security).userId;
		const db = scope.get(RepoDB);
		const rig = await db
			.insert(InventoryEntry)
			.values({
				id: await newId(scope.get(RepoDB)),
				slug: "ordered-rig",
				name: "Ordered rig",
				kind: "rig",
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: new Date(),
			})
			.returning()
			.get();
		await db
			.insert(Note)
			.values([
				{
					id: id53(),
					noteSubjectId: rig.id,
					body: "Later",
					observedAt: new Date("2026-09-21T15:00:00.000Z"),
					metadataCreatorId: creatorId,
					metadataCreationTimestamp: new Date("2026-09-21T15:01:00.000Z"),
				},
				{
					id: id53(),
					noteSubjectId: rig.id,
					body: "Earlier",
					observedAt: new Date("2026-09-21T14:00:00.000Z"),
					metadataCreatorId: creatorId,
					metadataCreationTimestamp: new Date("2026-09-21T15:02:00.000Z"),
				},
			])
			.run();
		const [args] = createMiddlewareArgs(scope, {
			request: new Request("http://localhost/demo/inventory/ordered-rig/notes"),
			params: { repo: "demo", entrySlug: "ordered-rig" },
		});

		const result = await loader(args);

		expect(result.notes.map((note) => note.body)).toEqual(["Earlier", "Later"]);
	});
});
