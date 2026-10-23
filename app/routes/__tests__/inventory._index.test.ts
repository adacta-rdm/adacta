import { describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoutesStub } from "react-router";

import * as inventoryRoute from "~/app/routes/inventory._index.tsx";
import {
	createTestEquipment,
	createTestManufacturer,
	createTestProduct,
	createTestRig,
} from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

function renderInventory(loaderData: Awaited<ReturnType<typeof inventoryRoute.loader>>) {
	const Stub = createRoutesStub([
		{
			path: "/inventory",
			Component: () =>
				createElement(inventoryRoute.default, { loaderData } as Parameters<
					typeof inventoryRoute.default
				>[0]),
		},
	]);

	return renderToStaticMarkup(createElement(Stub, { initialEntries: ["/inventory"] }));
}

describe("inventory._index", () => {
	describe("loader", () => {
		test("lists active rigs and equipment without requiring a location", async () => {
			const scope = await setupTestRequestScope();
			const rig10 = await createTestRig(scope, { name: "Rig 10" });
			const rig2 = await createTestRig(scope, { name: "Rig 2", building: "B3" });
			const equipment = await createTestEquipment(scope, { serialNumber: "SN-123" });
			await createTestRig(scope, { name: "Archived", metadataArchivedAt: new Date() });
			await createTestEquipment(scope, { slug: "archived", metadataArchivedAt: new Date() });
			const route = testRoute(scope, inventoryRoute, {});

			const result = await route.loader();

			expect(result.status).toBe(200);
			expect(result.data?.rigs.map((entry) => entry.id)).toEqual([rig2.id, rig10.id]);
			expect(result.data?.equipment.map((entry) => entry.id)).toEqual([equipment.id]);
		});

		test("filters archived records without changing the tab counts", async () => {
			const scope = await setupTestRequestScope();
			await createTestRig(scope, { name: "Active reactor" });
			await createTestEquipment(scope);
			const rig = await createTestRig(scope, {
				name: "Old reactor",
				metadataArchivedAt: new Date(),
			});
			await createTestEquipment(scope, { slug: "archived", metadataArchivedAt: new Date() });
			const route = testRoute(scope, inventoryRoute, {});

			const result = await route.loader({
				query: { rigs: "archived", equipment: "archived", q: "reactor" },
			});

			expect(result.data?.rigs.map((entry) => entry.id)).toEqual([rig.id]);
			expect(result.data?.equipment).toEqual([]);
			expect(result.data?.counts).toEqual({
				rigs: { active: 1, archived: 1 },
				equipment: { active: 1, archived: 1 },
			});
			expect(result.data?.showArchived).toEqual({ rigs: true, equipment: true });
		});

		test.each(["rigs", "equipment"] as const)("changes only the %s archive view", async (panel) => {
			const scope = await setupTestRequestScope();
			const rig = await createTestRig(scope);
			const archivedRig = await createTestRig(scope, {
				slug: "old-rig",
				metadataArchivedAt: new Date(),
			});
			const equipment = await createTestEquipment(scope);
			const archivedEquipment = await createTestEquipment(scope, {
				slug: "old-equipment",
				metadataArchivedAt: new Date(),
			});
			const route = testRoute(scope, inventoryRoute, {});

			const result = await route.loader({ query: { [panel]: "archived" } });

			expect(result.data?.rigs.map((entry) => entry.id)).toEqual([
				panel === "rigs" ? archivedRig.id : rig.id,
			]);
			expect(result.data?.equipment.map((entry) => entry.id)).toEqual([
				panel === "equipment" ? archivedEquipment.id : equipment.id,
			]);
		});

		test.each([
			["  B3   REACTOR ", true, false],
			["ACME m-20", false, true],
			["sn-123", false, true],
			["precision balance", false, true],
			["missing", false, false],
			["   ", true, true],
		])("filters both lists for %j", async (query, hasRig, hasEquipment) => {
			const scope = await setupTestRequestScope();
			const rig = await createTestRig(scope, { name: "Reactor", building: "B3" });
			const manufacturer = await createTestManufacturer(scope, { name: "Acme" });
			const product = await createTestProduct(scope, manufacturer, {
				name: "Balance",
				productNumber: "M-20",
				subtitle: "Precision balance",
			});
			const equipment = await createTestEquipment(scope, { serialNumber: "SN-123" }, product);
			const route = testRoute(scope, inventoryRoute, {});

			const result = await route.loader({ query: { q: query } });

			expect(result.data?.rigs.map((entry) => entry.id)).toEqual(hasRig ? [rig.id] : []);
			expect(result.data?.equipment.map((entry) => entry.id)).toEqual(
				hasEquipment ? [equipment.id] : [],
			);
		});
	});

	describe("component", () => {
		test("shows the rigs table above equipment with separate entry and model links", async () => {
			const scope = await setupTestRequestScope();
			const rig = await createTestRig(scope, { slug: "shared" });
			const manufacturer = await createTestManufacturer(scope);
			const product = await createTestProduct(scope, manufacturer);
			const equipment = await createTestEquipment(
				scope,
				{ slug: "shared", serialNumber: "SN-123", building: "B3", room: "101" },
				product,
			);
			const data = (await testRoute(scope, inventoryRoute, {}).loader()).data!;

			const html = renderInventory(data);

			expect(html.match(/<table\b/g)).toHaveLength(2);
			expect(html.indexOf('<table aria-label="Rigs"')).toBeLessThan(
				html.indexOf('<table aria-label="Equipment"'),
			);
			expect(html).toContain(`href="/inventory/rigs/${rig.slug}"`);
			expect(html).toContain(`href="/inventory/equipment/${equipment.slug}"`);
			expect(html).toContain(`href="/catalog/${manufacturer.slug}/${product.slug}"`);
			expect(html).not.toContain("Serial number");
			expect(html).not.toContain("SN-123");
			expect(html).toContain("Building B3 · Room 101");
			expect(html).toContain("No location recorded");
		});

		test("describes each empty list", async () => {
			const scope = await setupTestRequestScope();
			const data = (await testRoute(scope, inventoryRoute, {}).loader()).data!;

			const html = renderInventory(data);

			expect(html).toContain("No rigs have been recorded yet.");
			expect(html).toContain("No equipment has been recorded yet.");
			expect(html).toContain('href="/inventory/new"');
		});

		test("preserves the archived view and query in the search controls", async () => {
			const scope = await setupTestRequestScope();
			const rig = await createTestRig(scope, {
				name: "Old reactor",
				metadataArchivedAt: new Date(),
			});
			const data = (
				await testRoute(scope, inventoryRoute, {}).loader({
					query: { rigs: "archived", equipment: "archived", q: "reactor" },
				})
			).data!;

			const html = renderInventory(data);

			expect(html).toContain('name="rigs" value="archived"');
			expect(html).toContain('name="equipment" value="archived"');
			expect(html).toContain('aria-label="Clear filter"');
			expect(html).toContain('value="reactor"');
			expect(html.match(/role="search"/g)).toHaveLength(1);
			expect(html).toContain('href="/inventory?q=reactor&amp;equipment=archived"');
			expect(html).toContain('href="/inventory?q=reactor&amp;rigs=archived"');
			expect(html).toContain("Old reactor");
			expect(html).not.toContain(`href="/inventory/rigs/${rig.slug}"`);
		});

		test("describes empty filter results and offers to clear the filter", async () => {
			const scope = await setupTestRequestScope();
			await createTestRig(scope);
			const data = (await testRoute(scope, inventoryRoute, {}).loader({ query: { q: "missing" } }))
				.data!;

			const html = renderInventory(data);

			expect(html).toContain("No rigs match the filter.");
			expect(html).toContain("No equipment matches the filter.");
			expect(html).toContain("Clear filter");
			expect(html).toContain('value="missing"');
		});
	});
});
