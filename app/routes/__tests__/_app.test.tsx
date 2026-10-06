import { describe, expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";
import { createRoutesStub } from "react-router";

import * as appRoute from "~/app/routes/_app.tsx";
import * as batchPage from "~/app/routes/samples.$batchSlug._index.tsx";
import * as batchLayout from "~/app/routes/samples.$batchSlug.tsx";
import * as samplesRoute from "~/app/routes/samples.tsx";
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

	describe("component", () => {
		test("shows the breadcrumb trail above the batch page", async () => {
			const scope = await setupTestRequestScope();
			const batch = await createTestBatch(scope);
			const appData = (await testRoute(scope, appRoute, {}).loader()).data!;
			const params = { batchSlug: batch.slug };
			const layoutData = (await testRoute(scope, batchLayout, params).loader()).data!;
			const pageData = (await testRoute(scope, batchPage, params).loader()).data!;
			const Stub = createRoutesStub([
				{
					id: "app",
					Component: appRoute.default,
					loader: () => appData,
					children: [
						{
							path: "/samples",
							Component: samplesRoute.default,
							handle: samplesRoute.handle,
							children: [
								{
									id: "batch",
									path: ":batchSlug",
									Component: batchLayout.default,
									loader: () => layoutData,
									handle: batchLayout.handle,
									children: [
										{
											id: "page",
											index: true,
											Component: batchPage.default,
											loader: () => pageData,
										},
									],
								},
							],
						},
					],
				},
			]);

			const html = renderToStaticMarkup(
				<Stub
					initialEntries={[`/samples/${batch.slug}`]}
					hydrationData={{ loaderData: { app: appData, batch: layoutData, page: pageData } }}
				/>,
			);

			expect(html.match(/aria-label="Breadcrumb"/g)).toHaveLength(1);
			expect(html).toMatch(/aria-label="Breadcrumb".*Samples<\/a>.*Pt batch<\/span>.*<h1/);
			expect(html).toMatch(/<h1[^>]*>Pt batch<\/h1>/);
		});
	});
});
