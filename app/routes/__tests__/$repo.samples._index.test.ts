import { describe, expect, test } from "bun:test";

import * as indexRoute from "~/app/routes/$repo.samples._index.tsx";
import { RepoDB } from "~/app/services/RepoDB.ts";
import { Security } from "~/app/services/Security.ts";
import { createTestBatch, createTestSample } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { captureTestLogs, setupTestRepositoryEnvironment } from "~/app/testUtils/testUtils.ts";
import { Id } from "~/drizzle/schema/repo.Id.ts";
import { Sample } from "~/drizzle/schema/repo.Sample.ts";
import { SampleBatch } from "~/drizzle/schema/repo.SampleBatch.ts";
import { id53 } from "~/lib/id53/id53.ts";

describe("$repo.samples._index", () => {
	describe("loader", () => {
		test("describes each batch", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			const batch = await createTestBatch(scope, {
				slug: "pt-al2o3",
				name: "Pt/Al2O3",
				preparationDate: "2025-01-15",
			});
			await createTestSample(scope, batch, { name: "#01" });
			await createTestSample(scope, batch, { name: "#02" });

			const { batches } = (await route.loader()).data!;

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
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			const batch = await createTestBatch(scope);
			await createTestSample(scope, batch, { name: "#01", metadataArchivedAt: new Date() });
			await createTestSample(scope, batch, { name: "#02", metadataArchivedAt: new Date() });
			await createTestSample(scope, batch, { name: "#03", metadataArchivedAt: new Date() });

			const result = await route.loader();

			expect(result.data!.batches[0]?.sampleCount).toBe(0);
		});

		test("puts the most recently prepared batch first", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			await createTestBatch(scope, { slug: "older", name: "Older", preparationDate: "2024-03-01" });
			await createTestBatch(scope, { slug: "newer", name: "Newer", preparationDate: "2025-06-01" });

			expect((await route.loader()).data!.batches.map((batch) => batch.slug)).toEqual([
				"newer",
				"older",
			]);
		});

		test("the active tab leaves out an archived batch", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			await createTestBatch(scope, { slug: "kept", name: "Kept" });
			await createTestBatch(scope, { slug: "gone", name: "Gone", metadataArchivedAt: new Date() });

			const { batches } = (await route.loader()).data!;

			expect(batches.map((batch) => batch.slug)).toEqual(["kept"]);
		});

		test("the archived tab shows only the archived batches", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			await createTestBatch(scope, { slug: "kept", name: "Kept" });
			await createTestBatch(scope, { slug: "gone", name: "Gone", metadataArchivedAt: new Date() });

			const { batches } = (await route.loader({ query: { show: "archived" } })).data!;

			expect(batches.map((batch) => batch.slug)).toEqual(["gone"]);
		});

		test.each(["active", "archived"])("reports both counts on the %s tab", async (show) => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			await createTestBatch(scope, { slug: "kept", name: "Kept" });
			await createTestBatch(scope, { slug: "gone", name: "Gone", metadataArchivedAt: new Date() });
			await createTestBatch(scope, {
				slug: "also-gone",
				name: "Also gone",
				metadataArchivedAt: new Date(),
			});

			const result = await route.loader({ query: { show } });

			expect(result.data!.counts).toEqual({ active: 1, archived: 2 });
		});

		test.each([
			["active", false],
			["archived", true],
			["nonsense", false],
		] as const)("reports the selected tab for %s", async (show, expected) => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });

			const result = await route.loader({ query: { show } });

			expect(result.data!.showArchived).toBe(expected);
		});

		test("an archived batch reports when it was archived", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			await createTestBatch(scope, { slug: "gone", name: "Gone", metadataArchivedAt: new Date() });

			const { batches } = (await route.loader({ query: { show: "archived" } })).data!;

			expect(batches[0]?.archivedAt).toBeInstanceOf(Date);
		});

		test("no batch is open when the address does not ask for one", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			const batch = await createTestBatch(scope);
			await createTestSample(scope, batch, { name: "#01" });
			await createTestSample(scope, batch, { name: "#02" });

			const result = await route.loader();

			expect(result.data!.showArchived).toBe(false);
			expect(result.data!.open).toBeNull();
			expect(result.data!.openSamples).toBeNull();
		});

		test("the samples of the open batch are read", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			const batch = await createTestBatch(scope);
			await createTestSample(scope, batch, { name: "#01" });
			await createTestSample(scope, batch, { name: "#02" });

			const result = await route.loader({ query: { open: "pt-batch" } });

			expect(result.data!.open).toBe("pt-batch");
			expect(result.data!.openSamples?.map((sample) => sample.name)).toEqual(["#01", "#02"]);
		});

		test("the samples of the other batches are not read", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			const batch = await createTestBatch(scope);
			await createTestSample(scope, batch, { name: "#01" });
			await createTestSample(scope, batch, { name: "#02" });
			const otherBatch = await createTestBatch(scope, { slug: "pd-al2o3", name: "Pd/Al2O3" });
			await createTestSample(scope, otherBatch, { name: "#01" });
			await createTestSample(scope, otherBatch, { name: "#02" });
			await createTestSample(scope, otherBatch, { name: "#03" });

			const result = await route.loader({ query: { open: "pt-batch" } });

			expect(result.data!.openSamples).toHaveLength(2);
		});

		test("returns an empty list for an open batch with no samples", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			await createTestBatch(scope);

			expect((await route.loader({ query: { open: "pt-batch" } })).data!.openSamples).toEqual([]);
		});

		test("a batch that is not in the list is not open", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			const batch = await createTestBatch(scope, {
				slug: "gone",
				name: "Gone",
				metadataArchivedAt: new Date(),
			});
			await createTestSample(scope, batch, { name: "#01" });
			await createTestSample(scope, batch, { name: "#02" });

			const result = await route.loader({ query: { open: "gone" } });

			expect(result.data!.open).toBeNull();
			expect(result.data!.openSamples).toBeNull();
		});

		test("a batch of the archived tab can be open there", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			const batch = await createTestBatch(scope, {
				slug: "gone",
				name: "Gone",
				metadataArchivedAt: new Date(),
			});
			await createTestSample(scope, batch, { name: "#01" });
			await createTestSample(scope, batch, { name: "#02" });

			const result = await route.loader({ query: { show: "archived", open: "gone" } });

			expect(result.data!.open).toBe("gone");
			expect(result.data!.openSamples).toHaveLength(2);
		});

		test("a slug that is not a batch is ignored", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });

			expect((await route.loader({ query: { open: "no-such-batch" } })).data!.open).toBeNull();
		});
	});

	describe("action", () => {
		test("archives a batch and keeps its samples", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			const batch = await createTestBatch(scope);
			await createTestSample(scope, batch, { name: "#01" });
			await createTestSample(scope, batch, { name: "#02" });

			const result = await route.action({ archive: batch.slug });

			expect(result.status).toBe(303);
			expect((await route.loader()).data!.batches).toEqual([]);

			// The batch leaves the workflow. The record and its samples remain.
			const stored = await scope.get(RepoDB).select().from(SampleBatch).get();
			expect(stored?.metadataArchivedAt).toBeInstanceOf(Date);
			expect(
				(await route.loader({ query: { show: "archived", open: batch.slug } })).data!.openSamples,
			).toHaveLength(2);
		});

		test("answers 404 when archiving a batch that is not there", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });

			await expect(route.action({ archive: "no-such-batch" })).resolves.toMatchObject({
				status: 404,
			});
		});

		test("answers 404 for a batch that is already archived", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			const batch = await createTestBatch(scope, { metadataArchivedAt: new Date() });

			await expect(route.action({ archive: batch.slug })).resolves.toMatchObject({ status: 404 });
		});

		test("reports an unrecognized operation", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			await createTestBatch(scope);

			const result = await route.action({});

			expect(result.status).toBe(400);
			expect(result.data).toEqual({ errors: { form: "The batch action is not recognized." } });
		});

		test("restores an archived batch to the active tab", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			const batch = await createTestBatch(scope, { metadataArchivedAt: new Date() });
			await createTestSample(scope, batch, { name: "#01" });
			await createTestSample(scope, batch, { name: "#02" });

			const result = await route.action({ restore: batch.slug });

			expect(result.status).toBe(303);
			expect((await route.loader()).data!.batches.map((row) => row.slug)).toEqual(["pt-batch"]);
			expect((await route.loader({ query: { show: "archived" } })).data!.batches).toEqual([]);
			expect((await route.loader({ query: { open: batch.slug } })).data!.openSamples).toHaveLength(
				2,
			);
		});

		test("answers 404 when restoring a batch that is not there", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });

			await expect(route.action({ restore: "no-such-batch" })).resolves.toMatchObject({
				status: 404,
			});
		});

		test("answers 404 for a batch that is not archived", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			const batch = await createTestBatch(scope);

			await expect(route.action({ restore: batch.slug })).resolves.toMatchObject({ status: 404 });
		});

		test("adds a sample and leaves the row open", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			await createTestBatch(scope);

			const result = await route.action({ batch: "pt-batch", add: "", name: "#01" });

			expect(result.status).toBe(303);
			expect(result.location).toBe("/test/samples?open=pt-batch");
			expect(
				(await route.loader({ query: { open: "pt-batch" } })).data!.openSamples?.map((s) => s.name),
			).toEqual(["#01"]);
		});

		test("reports a label the batch already holds, without leaving the list", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			const batch = await createTestBatch(scope);
			await createTestSample(scope, batch, { name: "#01" });

			const result = await route.action({ batch: "pt-batch", add: "", name: "#01" });

			expect(result).toMatchObject({ status: 400 });
			expect(result.data).toEqual({
				errors: { name: 'This batch already contains a sample named "#01".' },
			});
			expect((await route.loader({ query: { open: "pt-batch" } })).data!.openSamples).toHaveLength(
				1,
			);
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
			const lines = captureTestLogs(scope);
			const route = testRoute(scope, indexRoute, { repo: "test" });

			const result = await route.action({ batch: batch.slug, add: "", name: "01" });

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
			expect((await route.loader({ query: { open: batch.slug } })).data!.openSamples).toHaveLength(
				5,
			);
		});

		test("deletes a sample and leaves the row open", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			const batch = await createTestBatch(scope);
			const sample = await createTestSample(scope, batch);
			await createTestSample(scope, batch, { name: "#02" });

			const result = await route.action({ batch: "pt-batch", delete: String(sample.id) });

			expect(result.location).toBe("/test/samples?open=pt-batch");
			expect((await route.loader({ query: { open: "pt-batch" } })).data!.openSamples).toHaveLength(
				1,
			);
		});

		test("answers 404 when adding a sample to a batch that is not there", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });

			await expect(
				route.action({ batch: "no-such-batch", add: "", name: "#01" }),
			).resolves.toMatchObject({
				status: 404,
			});
		});

		test("answers 404 for an archived batch", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, indexRoute, { repo: "test" });
			await createTestBatch(scope, { slug: "gone", name: "Gone", metadataArchivedAt: new Date() });

			await expect(route.action({ batch: "gone", add: "", name: "#01" })).resolves.toMatchObject({
				status: 404,
			});
		});
	});
});
