import { describe, expect, test } from "bun:test";

import { eq } from "drizzle-orm";

import * as batchRoute from "~/app/routes/$repo.samples.$batchSlug.tsx";
import * as indexRoute from "~/app/routes/$repo.samples._index.tsx";
import * as newRoute from "~/app/routes/$repo.samples.new.tsx";
import { RepoAccess } from "~/app/services/RepoAccess.ts";
import { RepoDB } from "~/app/services/RepoDB.ts";
import { RepoManager } from "~/app/services/RepoManager.ts";
import { Security } from "~/app/services/Security.ts";
import { createTestBatch } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRepositoryEnvironment, signUpTestUser } from "~/app/testUtils/testUtils.ts";
import { Id } from "~/drizzle/schema/repo.Id.ts";

describe("$repo.samples.new", () => {
	describe("loader", () => {
		test("returns the current user and available preparers", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, newRoute, { repo: "test" });

			const result = await route.loader();

			expect(result.status).toBe(200);
			expect(result.data!.currentUserId).toBe(scope.get(Security).userId);
			expect(result.data!.preparers).toContainEqual(
				expect.objectContaining({ id: scope.get(Security).userId, name: "Test User" }),
			);
		});
	});

	describe("action", () => {
		test("creates a batch and redirects to it", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, newRoute, { repo: "test" });

			const result = await route.action({
				name: "Pt batch",
				preparationDate: "2025-01-15",
				preparedById: scope.get(Security).userId,
				activeMaterial: "Pt",
				support: "Al2O3",
			});

			expect(result.status).toBe(303);
			expect(result.location).toBe("/test/samples/pt-batch");
			const { batch } = (
				await testRoute(scope, batchRoute, { repo: "test", batchSlug: "pt-batch" }).loader()
			).data!;
			expect(batch).toMatchObject({
				name: "Pt batch",
				preparationDate: "2025-01-15",
				activeMaterial: "Pt",
				support: "Al2O3",
			});
			expect(await scope.get(RepoDB).select().from(Id).where(eq(Id.id, batch.id)).get()).toEqual({
				id: batch.id,
			});
		});

		test("leaves an omitted composition empty", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, newRoute, { repo: "test" });

			const result = await route.action({
				name: "Pt batch",
				preparationDate: "2025-01-15",
				preparedById: scope.get(Security).userId,
				activeMaterial: "  ",
				support: "",
			});

			expect(result.status).toBe(303);
			expect(
				(await testRoute(scope, batchRoute, { repo: "test", batchSlug: "pt-batch" }).loader()).data!
					.batch,
			).toMatchObject({ activeMaterial: null, support: null });
		});

		test("keeps generated slugs unique", async () => {
			const scope = await setupTestRepositoryEnvironment();
			await createTestBatch(scope);
			const route = testRoute(scope, newRoute, { repo: "test" });

			const result = await route.action({
				name: "Pt batch",
				preparationDate: "2025-01-15",
				preparedById: scope.get(Security).userId,
			});

			expect(result.status).toBe(303);
			expect(result.location).toBe("/test/samples/pt-batch-2");
			expect(
				(await testRoute(scope, indexRoute, { repo: "test" }).loader()).data!.batches.map(
					(batch) => batch.slug,
				),
			).toEqual(expect.arrayContaining(["pt-batch", "pt-batch-2"]));
		});

		test("records the preparer separately from the record creator", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const preparedById = await signUpTestUser(scope, {
				name: "Zoe Researcher",
				email: "zoe.researcher@example.com",
			});
			await scope.get(RepoManager).grantAccess(preparedById, "test");
			const route = testRoute(scope, newRoute, { repo: "test" });

			const result = await route.action({
				name: "Pt batch",
				preparationDate: "2025-01-15",
				preparedById,
			});

			expect(result.status).toBe(303);
			const { batch } = (
				await testRoute(scope, batchRoute, { repo: "test", batchSlug: "pt-batch" }).loader()
			).data!;
			expect(batch.preparedById).toBe(preparedById);
			expect(batch.metadataCreatorId).toBe(scope.get(Security).userId);
		});

		test("accepts a record-only user as the preparer", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const preparer = await scope
				.get(RepoAccess)
				.createRecordOnlyUser({ name: "Ada Example", email: "ada@example.com" });
			const route = testRoute(scope, newRoute, { repo: "test" });

			const result = await route.action({
				name: "Pt batch",
				preparationDate: "2025-01-15",
				preparedById: preparer.id,
			});

			expect(result.status).toBe(303);
			expect(
				(await testRoute(scope, batchRoute, { repo: "test", batchSlug: "pt-batch" }).loader()).data!
					.batch.preparedById,
			).toBe(preparer.id);
		});

		test("rejects a batch without a name", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, newRoute, { repo: "test" });

			const result = await route.action({
				name: "   ",
				preparationDate: "2025-01-15",
				preparedById: scope.get(Security).userId,
			});

			expect(result.status).toBe(400);
			expect(result.data).toEqual({ error: "A batch name is required." });
			expect((await testRoute(scope, indexRoute, { repo: "test" }).loader()).data!.batches).toEqual(
				[],
			);
		});

		test("rejects a preparation date that is not a calendar date", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const route = testRoute(scope, newRoute, { repo: "test" });

			const result = await route.action({
				name: "Pt batch",
				preparationDate: "2025-02-30",
				preparedById: scope.get(Security).userId,
			});

			expect(result.status).toBe(400);
			expect(result.data).toEqual({ error: "The preparation date is not a valid calendar date." });
			expect((await testRoute(scope, indexRoute, { repo: "test" }).loader()).data!.batches).toEqual(
				[],
			);
		});

		test("rejects a preparer who cannot open the repository", async () => {
			const scope = await setupTestRepositoryEnvironment();
			const outsider = await signUpTestUser(scope, { email: "outsider@example.com" });
			const route = testRoute(scope, newRoute, { repo: "test" });

			const result = await route.action({
				name: "Pt batch",
				preparationDate: "2025-01-15",
				preparedById: outsider,
			});

			expect(result.status).toBe(400);
			expect(result.data).toEqual({
				error: "The selected preparer is not a user of this repository.",
			});
			expect((await testRoute(scope, indexRoute, { repo: "test" }).loader()).data!.batches).toEqual(
				[],
			);
		});
	});
});
