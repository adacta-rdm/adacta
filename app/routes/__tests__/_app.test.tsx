import { describe, expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";
import { createRoutesStub } from "react-router";

import * as appRoute from "~/app/routes/_app.tsx";
import * as batchPage from "~/app/routes/samples.$batchSlug._index.tsx";
import * as batchLayout from "~/app/routes/samples.$batchSlug.tsx";
import * as samplesRoute from "~/app/routes/samples.tsx";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { createTestBatch } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import {
	setupEmptyTestDatabaseEnvironment,
	setupTestRequestScope,
	signInTestUser,
	signUpTestUser,
} from "~/app/testUtils/testUtils.ts";

describe("_app", () => {
	describe("loader", () => {
		test("reads the sidebar width and collapsed state from cookies", async () => {
			const scope = await setupTestRequestScope();
			const [args] = createMiddlewareArgs(scope, {
				request: new Request("http://localhost/", {
					headers: { cookie: "adacta.sidebar.width=320; adacta.sidebar.collapsed=true" },
				}),
			});

			const result = await appRoute.loader(args);

			expect(result).toEqual({ sidebarCollapsed: true, sidebarWidth: 320 });
		});
	});

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

	describe("component", () => {
		test("shows the breadcrumb trail above the batch page", async () => {
			const scope = await setupTestRequestScope();
			const batch = await createTestBatch(scope);
			const appData = (await testRoute(scope, appRoute, {}).loader()).data!;
			const samplesData = (await testRoute(scope, samplesRoute, {}).loader()).data!;
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
							id: "routes/samples",
							path: "/samples",
							Component: samplesRoute.default,
							loader: () => samplesData,
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
					hydrationData={{
						loaderData: {
							app: appData,
							"routes/samples": samplesData,
							batch: layoutData,
							page: pageData,
						},
					}}
				/>,
			);

			expect(html.match(/aria-label="Breadcrumb"/g)).toHaveLength(1);
			expect(html).toContain('aria-label="Batches by composition"');
			expect(html).toMatch(/aria-label="Breadcrumb".*Samples<\/a>.*Pt batch<\/span>.*<h1/);
			expect(html).toMatch(/<h1[^>]*>Pt batch<\/h1>/);
		});
	});
});
