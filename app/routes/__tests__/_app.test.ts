import { describe, expect, test } from "bun:test";

import * as appRoute from "~/app/routes/_app.tsx";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { createTestBatch, createTestRig } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import {
	setupEmptyTestDatabaseEnvironment,
	setupTestRequestScope,
	signInTestUser,
	signUpTestUser,
} from "~/app/testUtils/testUtils.ts";

describe("_app", () => {
	describe("middleware", () => {
		test("opens the application for a signed-in user", async () => {
			const scope = await setupEmptyTestDatabaseEnvironment();
			await signUpTestUser(scope);
			const cookie = await signInTestUser(scope);
			const [args] = createMiddlewareArgs(scope, {
				request: new Request("http://localhost/inventory", { headers: { cookie } }),
			});

			for (const middleware of appRoute.middleware) {
				await middleware(args, async () => new Response());
			}
			const result = await testRoute(scope, appRoute, {}).loader();

			expect(result.status).toBe(200);
		});
	});

	describe("loader", () => {
		test("loads the active sidebar trees", async () => {
			const scope = await setupTestRequestScope();
			const rig = await createTestRig(scope, {
				locationBuildingIdentifier: "B3",
				locationRoomIdentifier: "101",
			});
			const batch = await createTestBatch(scope, { activeMaterial: "Pt", support: "Al2O3" });
			await createTestRig(scope, { name: "Archived rig", metadataArchivedAt: new Date() });
			await createTestBatch(scope, { name: "Archived batch", metadataArchivedAt: new Date() });
			const route = testRoute(scope, appRoute, {});

			const result = await route.loader();

			expect(result.status).toBe(200);
			expect(result.data?.entries.map((entry) => entry.slug)).toEqual([rig.slug]);
			expect(result.data?.buildings[0]?.rooms[0]?.entries[0]?.slug).toBe(rig.slug);
			expect(result.data?.batchGroups[0]?.supports[0]?.batches.map((row) => row.slug)).toEqual([
				batch.slug,
			]);
		});
	});
});
