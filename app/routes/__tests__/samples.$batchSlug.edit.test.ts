import { describe, expect, test } from "bun:test";

import * as batchRoute from "~/app/routes/samples.$batchSlug._index.tsx";
import * as editRoute from "~/app/routes/samples.$batchSlug.edit.tsx";
import { Security } from "~/app/services/Security.ts";
import { createTestBatch } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("samples.$batchSlug.edit", () => {
	describe("loader", () => {
		test("returns the batch and the people who may prepare it", async () => {
			const scope = await setupTestRequestScope();
			const batch = await createTestBatch(scope);
			const route = testRoute(scope, editRoute, { batchSlug: batch.slug });

			const result = await route.loader();

			expect(result.status).toBe(200);
			expect(result.data!.batch).toMatchObject({ name: "Pt batch", preparationDate: "2026-01-15" });
			expect(result.data!.preparers).toContainEqual(
				expect.objectContaining({ id: scope.get(Security).userId }),
			);
		});

		test("answers 404 for a batch that is not there", async () => {
			const scope = await setupTestRequestScope();
			const route = testRoute(scope, editRoute, { batchSlug: "no-such-batch" });

			const result = await route.loader();

			expect(result.status).toBe(404);
		});

		test("answers 404 for an archived batch", async () => {
			const scope = await setupTestRequestScope();
			const batch = await createTestBatch(scope, { metadataArchivedAt: new Date() });
			const route = testRoute(scope, editRoute, { batchSlug: batch.slug });

			const result = await route.loader();

			expect(result.status).toBe(404);
		});
	});

	describe("action", () => {
		test("stores the new values and returns to the batch page", async () => {
			const scope = await setupTestRequestScope();
			const batch = await createTestBatch(scope);
			const route = testRoute(scope, editRoute, { batchSlug: batch.slug });

			const result = await route.action({
				name: "Pd batch",
				preparationDate: "2026-03-02",
				preparedById: batch.preparedById,
				activeMaterial: "Pd",
				support: "Al2O3",
			});

			expect(result.status).toBe(303);
			expect(result.location).toBe(`/samples/${batch.slug}`);
			expect(
				(await testRoute(scope, batchRoute, { batchSlug: batch.slug }).loader()).data!.batch,
			).toMatchObject({
				name: "Pd batch",
				preparationDate: "2026-03-02",
				activeMaterial: "Pd",
				support: "Al2O3",
			});
		});

		test("keeps the slug when the name changes, so old links still work", async () => {
			const scope = await setupTestRequestScope();
			const batch = await createTestBatch(scope);
			const route = testRoute(scope, editRoute, { batchSlug: batch.slug });

			const result = await route.action({
				name: "A completely different name",
				preparationDate: batch.preparationDate,
				preparedById: batch.preparedById,
			});

			expect(result.status).toBe(303);
			const { status, data } = await testRoute(scope, batchRoute, {
				batchSlug: batch.slug,
			}).loader();
			expect(status).toBe(200);
			expect(data!.batch.slug).toBe(batch.slug);
			expect(data!.batch.name).toBe("A completely different name");
		});

		test("an empty active material is stored as no value", async () => {
			const scope = await setupTestRequestScope();
			const batch = await createTestBatch(scope, { activeMaterial: "Pt" });
			const route = testRoute(scope, editRoute, { batchSlug: batch.slug });

			const result = await route.action({
				name: batch.name,
				preparationDate: batch.preparationDate,
				preparedById: batch.preparedById,
				activeMaterial: "",
			});

			expect(result.status).toBe(303);
			expect(
				(await testRoute(scope, batchRoute, { batchSlug: batch.slug }).loader()).data!.batch
					.activeMaterial,
			).toBeNull();
		});

		test("refuses an empty name", async () => {
			const scope = await setupTestRequestScope();
			const batch = await createTestBatch(scope);
			const route = testRoute(scope, editRoute, { batchSlug: batch.slug });

			const result = await route.action({
				name: "",
				preparationDate: batch.preparationDate,
				preparedById: batch.preparedById,
			});

			expect(result.status).toBe(400);
			expect(result.data).toEqual({ error: "A batch name is required." });
			expect(
				(await testRoute(scope, batchRoute, { batchSlug: batch.slug }).loader()).data!.batch.name,
			).toBe(batch.name);
		});

		test("refuses a date that is not a calendar date", async () => {
			const scope = await setupTestRequestScope();
			const batch = await createTestBatch(scope);
			const route = testRoute(scope, editRoute, { batchSlug: batch.slug });

			const result = await route.action({
				name: batch.name,
				preparationDate: "2026-02-31",
				preparedById: batch.preparedById,
			});

			expect(result.status).toBe(400);
			expect(result.data).toEqual({ error: "The preparation date is not a valid calendar date." });
		});

		test("refuses a preparer whose user ID does not exist", async () => {
			const scope = await setupTestRequestScope();
			const batch = await createTestBatch(scope);
			const route = testRoute(scope, editRoute, { batchSlug: batch.slug });

			const result = await route.action({
				name: batch.name,
				preparationDate: batch.preparationDate,
				preparedById: "someone-else",
			});

			expect(result.status).toBe(400);
			expect(result.data).toEqual({
				error: "The selected preparer is not a registered user.",
			});
		});

		test("answers 404 for an archived batch", async () => {
			const scope = await setupTestRequestScope();
			const batch = await createTestBatch(scope, { metadataArchivedAt: new Date() });
			const route = testRoute(scope, editRoute, { batchSlug: batch.slug });

			const result = await route.action({
				name: batch.name,
				preparationDate: batch.preparationDate,
				preparedById: batch.preparedById,
			});

			expect(result.status).toBe(404);
		});
	});
});
