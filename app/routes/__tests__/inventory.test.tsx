import { describe, expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";
import { createRoutesStub } from "react-router";

import * as appRoute from "~/app/routes/_app.tsx";
import * as inventoryIndex from "~/app/routes/inventory._index.tsx";
import * as inventoryRoute from "~/app/routes/inventory.tsx";
import { createTestRig } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("inventory", () => {
	describe("loader", () => {
		test("groups active entries by location", async () => {
			const scope = await setupTestRequestScope();
			const rig = await createTestRig(scope, {
				locationBuildingIdentifier: "B3",
				locationRoomIdentifier: "101",
			});
			await createTestRig(scope, { name: "Archived rig", metadataArchivedAt: new Date() });
			const route = testRoute(scope, inventoryRoute, {});

			const result = await route.loader();

			expect(result.status).toBe(200);
			expect(result.data?.entries.map((entry) => entry.slug)).toEqual([rig.slug]);
			expect(result.data?.buildings[0]?.rooms[0]?.entries[0]?.slug).toBe(rig.slug);
		});
	});

	describe("sidebar", () => {
		test("renders the location tree with padded nested rows", async () => {
			const scope = await setupTestRequestScope();
			const rig = await createTestRig(scope, {
				locationBuildingIdentifier: "B3",
				locationRoomIdentifier: "101",
			});
			const appData = (await testRoute(scope, appRoute, {}).loader()).data!;
			const inventoryData = (await testRoute(scope, inventoryRoute, {}).loader()).data!;
			const Stub = createRoutesStub([
				{
					id: "app",
					Component: appRoute.default,
					loader: () => appData,
					children: [
						{
							id: "routes/inventory",
							path: "/inventory",
							Component: inventoryRoute.default,
							loader: () => inventoryData,
							handle: inventoryRoute.handle,
							children: [{ index: true, Component: inventoryIndex.default }],
						},
					],
				},
			]);

			const html = renderToStaticMarkup(
				<Stub
					initialEntries={["/inventory"]}
					hydrationData={{ loaderData: { app: appData, "routes/inventory": inventoryData } }}
				/>,
			);

			expect(html).toContain('aria-label="Inventory by location"');
			expect(html).toContain(`href="/inventory/${rig.slug}"`);
			expect(html).toContain("before:left-4");
			expect(html).toContain("before:left-8");
		});
	});
});
