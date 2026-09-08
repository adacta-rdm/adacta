import { describe, expect, test } from "bun:test";

import { eq } from "drizzle-orm";

import { action, loader } from "~/app/routes/$repo.samples._index.tsx";
import { RepoDB } from "~/app/services/RepoDB.ts";
import { Security } from "~/app/services/Security.ts";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { setupTestRepositoryEnvironment } from "~/app/testUtils/testUtils.ts";
import { Sample } from "~/drizzle/schema/repo.Sample.ts";
import { SampleBatch } from "~/drizzle/schema/repo.SampleBatch.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";

describe("samples index loader", () => {
	test("describes each batch", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		addBatch(scope, { slug: "pt-al2o3", name: "Pt/Al2O3", preparationDate: "2025-01-15" }, 2);

		const { batches } = await load(scope);

		expect(batches).toEqual([
			expect.objectContaining({
				slug: "pt-al2o3",
				name: "Pt/Al2O3",
				preparationDate: "2025-01-15",
				sampleCount: 2,
				preparedBy: expect.objectContaining({ name: "Test User" }),
			}),
		]);
	});

	test("counts only the samples that are not archived", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const batch = addBatch(scope, { slug: "pt-al2o3", name: "Pt/Al2O3" }, 3);

		scope
			.get(RepoDB)
			.update(Sample)
			.set({ metadataArchivedAt: new Date() })
			.where(eq(Sample.batchId, batch.id))
			.run();

		expect((await load(scope)).batches[0]?.sampleCount).toBe(0);
	});

	test("puts the most recently prepared batch first", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		addBatch(scope, { slug: "older", name: "Older", preparationDate: "2024-03-01" });
		addBatch(scope, { slug: "newer", name: "Newer", preparationDate: "2025-06-01" });

		expect((await load(scope)).batches.map((batch) => batch.slug)).toEqual(["newer", "older"]);
	});

	test("leaves out an archived batch", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const batch = addBatch(scope, { slug: "pt-al2o3", name: "Pt/Al2O3" });

		scope
			.get(RepoDB)
			.update(SampleBatch)
			.set({ metadataArchivedAt: new Date() })
			.where(eq(SampleBatch.id, batch.id))
			.run();

		expect((await load(scope)).batches).toEqual([]);
	});
});

describe("samples index action", () => {
	test("archives a batch and keeps its samples", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const batch = addBatch(scope, { slug: "pt-al2o3", name: "Pt/Al2O3" }, 2);

		const response = await archive(scope, batch.slug);

		expect(response).toBeInstanceOf(Response);
		expect((await load(scope)).batches).toEqual([]);

		// The batch leaves the workflow. The record and its samples remain.
		const stored = scope.get(RepoDB).select().from(SampleBatch).get();
		expect(stored?.metadataArchivedAt).toBeInstanceOf(Date);
		expect(scope.get(RepoDB).select().from(Sample).all()).toHaveLength(2);
	});

	test("answers 404 for a batch that is not there", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");

		expect(archive(scope, "no-such-batch")).rejects.toMatchObject({ status: 404 });
	});

	test("answers 404 for a batch that is already archived", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const batch = addBatch(scope, { slug: "pt-al2o3", name: "Pt/Al2O3" });
		await archive(scope, batch.slug);

		expect(archive(scope, batch.slug)).rejects.toMatchObject({ status: 404 });
	});

	test("reports an unrecognized operation", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		addBatch(scope, { slug: "pt-al2o3", name: "Pt/Al2O3" });

		const response = await submit(scope, {});
		if (response instanceof Response) throw new Error("Expected action data.");

		expect(response.init?.status).toBe(400);
		expect(response.data).toEqual({ errors: { form: "The batch action is not recognized." } });
	});
});

describe("samples index archived tab", () => {
	test("the active tab leaves out an archived batch", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		addBatch(scope, { slug: "kept", name: "Kept" });
		addBatch(scope, { slug: "gone", name: "Gone" });
		markArchived(scope, "gone");

		const { batches } = await load(scope);

		expect(batches.map((batch) => batch.slug)).toEqual(["kept"]);
	});

	test("the archived tab shows only the archived batches", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		addBatch(scope, { slug: "kept", name: "Kept" });
		addBatch(scope, { slug: "gone", name: "Gone" });
		markArchived(scope, "gone");

		const { batches } = await load(scope, "?show=archived");

		expect(batches.map((batch) => batch.slug)).toEqual(["gone"]);
	});

	test("both counts are reported on either tab, so the tabs can be labelled", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		addBatch(scope, { slug: "kept", name: "Kept" });
		addBatch(scope, { slug: "gone", name: "Gone" });
		addBatch(scope, { slug: "also-gone", name: "Also gone" });
		markArchived(scope, "gone");
		markArchived(scope, "also-gone");

		expect((await load(scope)).counts).toEqual({ active: 1, archived: 2 });
		expect((await load(scope, "?show=archived")).counts).toEqual({ active: 1, archived: 2 });
	});

	test("the tab in view is reported, and an unknown value falls back to active", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");

		expect((await load(scope)).showArchived).toBe(false);
		expect((await load(scope, "?show=archived")).showArchived).toBe(true);
		expect((await load(scope, "?show=nonsense")).showArchived).toBe(false);
	});

	test("an archived batch reports when it was archived", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		addBatch(scope, { slug: "gone", name: "Gone" });
		markArchived(scope, "gone");

		const { batches } = await load(scope, "?show=archived");

		expect(batches[0]?.archivedAt).toBeInstanceOf(Date);
	});
});

describe("samples index restore", () => {
	test("restores an archived batch to the active tab", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const batch = addBatch(scope, { slug: "pt-al2o3", name: "Pt/Al2O3" }, 2);
		await archive(scope, batch.slug);

		const response = await restore(scope, batch.slug);

		expect(response).toBeInstanceOf(Response);
		expect((await load(scope)).batches.map((row) => row.slug)).toEqual(["pt-al2o3"]);
		expect((await load(scope, "?show=archived")).batches).toEqual([]);
		expect(scope.get(RepoDB).select().from(Sample).all()).toHaveLength(2);
	});

	test("answers 404 for a batch that is not there", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");

		expect(restore(scope, "no-such-batch")).rejects.toMatchObject({ status: 404 });
	});

	test("answers 404 for a batch that is not archived", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const batch = addBatch(scope, { slug: "pt-al2o3", name: "Pt/Al2O3" });

		expect(restore(scope, batch.slug)).rejects.toMatchObject({ status: 404 });
	});
});

function submit(scope: ServiceContainer, fields: Record<string, string>) {
	const form = new FormData();
	for (const [name, value] of Object.entries(fields)) form.set(name, value);

	const request = new Request("http://localhost/demo/samples", { method: "POST", body: form });
	const [args] = createMiddlewareArgs(scope, { request, params: { repo: "demo" } });

	return action(args);
}

function archive(scope: ServiceContainer, slug: string) {
	return submit(scope, { archive: slug });
}

async function load(scope: ServiceContainer, search = "") {
	const request = new Request(`http://localhost/demo/samples${search}`);
	const [args] = createMiddlewareArgs(scope, { request, params: { repo: "demo" } });

	return loader(args);
}

function restore(scope: ServiceContainer, slug: string) {
	return submit(scope, { restore: slug });
}

/**
 * Archive a batch straight in the database, when the test is about what the
 * loader shows rather than about the archive action itself.
 */
function markArchived(scope: ServiceContainer, slug: string) {
	scope
		.get(RepoDB)
		.update(SampleBatch)
		.set({ metadataArchivedAt: new Date() })
		.where(eq(SampleBatch.slug, slug))
		.run();
}

/**
 * Write one batch and the given number of samples in it.
 */
function addBatch(
	scope: ServiceContainer,
	values: { slug: string; name: string; preparationDate?: string },
	sampleCount = 0,
) {
	const db = scope.get(RepoDB);
	const userId = scope.get(Security).userId;
	const metadata = {
		metadataCreatorId: userId,
		metadataCreationTimestamp: new Date("2026-01-15T12:00:00.000Z"),
	};

	const batch = db
		.insert(SampleBatch)
		.values({
			slug: values.slug,
			name: values.name,
			preparationDate: values.preparationDate ?? "2025-01-15",
			preparedById: userId,
			...metadata,
		})
		.returning()
		.get();

	for (let index = 1; index <= sampleCount; index++) {
		db.insert(Sample)
			.values({
				batchId: batch.id,
				slug: `0${index}`,
				name: `#0${index}`,
				preparedById: userId,
				...metadata,
			})
			.run();
	}

	return batch;
}
