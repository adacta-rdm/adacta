import { describe, expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";
import { createRoutesStub } from "react-router";

import * as appRoute from "~/app/routes/_app.tsx";
import * as inventoryRoute from "~/app/routes/inventory.tsx";
import { createTestEquipment, createTestRig } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("inventory", () => {
	describe("loader", () => {
		test("groups active entries by location", async () => {
			const scope = await setupTestRequestScope();
			const rig = await createTestRig(scope, {
				building: "B3",
				room: "101",
			});
			await createTestRig(scope, { name: "Archived rig", metadataArchivedAt: new Date() });
			const route = testRoute(scope, inventoryRoute, {});

			const result = await route.loader();

			expect(result.status).toBe(200);
			const slugs = result.data?.buildings.flatMap((building) =>
				building.rooms.flatMap((room) => room.entries.map((entry) => entry.slug)),
			);
			expect(slugs).toEqual([rig.slug]);
		});
	});

	describe("sidebar", () => {
		test.each(["rigs", "equipment"])(
			"selects only the current %s entry when slugs match",
			async (kind) => {
				const scope = await setupTestRequestScope();
				await createTestRig(scope, {
					slug: "balance",
					building: "B3",
					room: "101",
				});
				await createTestEquipment(scope, {
					slug: "balance",
					building: "B3",
					room: "101",
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
								children: [
									{ id: "routes/inventory.rigs.$slug", path: "rigs/:slug", Component: () => null },
									{
										id: "routes/inventory.equipment.$slug",
										path: "equipment/:slug",
										Component: () => null,
									},
								],
							},
						],
					},
				]);

				const html = renderToStaticMarkup(
					<Stub
						initialEntries={[`/inventory/${kind}/balance`]}
						hydrationData={{ loaderData: { app: appData, "routes/inventory": inventoryData } }}
					/>,
				);

				expect(html).toContain('aria-label="Inventory by location"');
				expect(html).toContain('href="/inventory/rigs/balance"');
				expect(html).toContain('href="/inventory/equipment/balance"');
				const activeEntries = [...html.matchAll(/<a\b[^>]*>/g)]
					.map(([tag]) => tag)
					.filter(
						(tag) =>
							tag.includes('data-current="true"') &&
							/href="\/inventory\/(rigs|equipment)\//.test(tag),
					);
				expect(activeEntries).toHaveLength(1);
				expect(activeEntries[0]).toContain(`href="/inventory/${kind}/balance"`);
				expect(html).toContain("before:left-4");
				expect(html).toContain("before:left-8");
			},
		);
	});
});
