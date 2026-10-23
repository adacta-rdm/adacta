import { describe, expect, test } from "bun:test";

import { eq } from "drizzle-orm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoutesStub } from "react-router";

import * as datasetRoute from "~/app/routes/files.datasets.$datasetId.tsx";
import * as originalRoute from "~/app/routes/files.originals.$fileId.ts";
import * as inventoryRoute from "~/app/routes/inventory._index.tsx";
import * as equipmentRoute from "~/app/routes/inventory.equipment.$slug.tsx";
import * as dataRoute from "~/app/routes/inventory.rigs.$slug.data._index.tsx";
import * as notesRoute from "~/app/routes/inventory.rigs.$slug.notes.tsx";
import * as pidRoute from "~/app/routes/inventory.rigs.$slug.pid.tsx";
import * as rigRoute from "~/app/routes/inventory.rigs.$slug.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import {
	createTestEquipment,
	createTestPIDNode,
	createTestDataset,
	createTestNote,
	createTestManufacturer,
	createTestProduct,
	createTestRig,
} from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";
import { Equipment } from "~/drizzle/schema/Equipment.ts";
import { Rig } from "~/drizzle/schema/Rig.ts";

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

	describe("action", () => {
		test.each([
			["rig", "archive"],
			["rig", "restore"],
			["equipment", "archive"],
			["equipment", "restore"],
		] as const)("performs %s %s without changing identity", async (kind, operation) => {
			const scope = await setupTestRequestScope();
			const metadataArchivedAt = operation === "restore" ? new Date() : null;
			const entry =
				kind === "rig"
					? await createTestRig(scope, { metadataArchivedAt })
					: await createTestEquipment(scope, { serialNumber: "SN-17", metadataArchivedAt });
			const route = testRoute(scope, inventoryRoute, {});
			const detail = testRoute(scope, kind === "rig" ? rigRoute : equipmentRoute, {
				slug: entry.slug,
			});
			const query = { q: "sensor", rigs: "archived", equipment: "archived" };

			const result = await route.action({ kind, slug: entry.slug, operation }, { query });

			expect(result.status).toBe(303);
			expect(result.location).toBe("/inventory?q=sensor&rigs=archived&equipment=archived");
			const loaded = await detail.loader();
			expect(loaded.status).toBe(200);
			if (operation === "archive") expect(loaded.data?.archivedAt).toBeInstanceOf(Date);
			else expect(loaded.data?.archivedAt).toBeNull();
			const panel = kind === "rig" ? "rigs" : "equipment";
			const visible = await route.loader({
				query: operation === "archive" ? { [panel]: "archived" } : {},
			});
			expect(visible.data![panel][0]?.id).toBe(entry.id);
			if (kind === "equipment")
				expect(
					(await testRoute(scope, equipmentRoute, { slug: entry.slug }).loader()).data
						?.serialNumber,
				).toBe("SN-17");
		});

		test("keeps diagrams, notes, datasets, and equipment when archiving a rig", async () => {
			const scope = await setupTestRequestScope();
			const { rig, datasetId } = await createTestDataset(scope);
			const equipment = await createTestEquipment(scope);
			const node = await createTestPIDNode(scope, rig, { equipmentId: equipment.id });
			await createTestNote(scope, rig.id, { body: "Calibration retained" });
			const route = testRoute(scope, inventoryRoute, {});

			const result = await route.action({ kind: "rig", slug: rig.slug, operation: "archive" });

			expect(result.status).toBe(303);
			expect(
				(await testRoute(scope, pidRoute, { slug: rig.slug }).loader()).data?.graph.nodes[0]?.id,
			).toBe(node.id);
			expect(
				(await testRoute(scope, notesRoute, { slug: rig.slug }).loader()).data?.notes[0]?.body,
			).toBe("Calibration retained");
			expect(
				(await testRoute(scope, dataRoute, { slug: rig.slug }).loader()).data?.datasets[0]?.id,
			).toBe(datasetId);
			expect(
				(await testRoute(scope, equipmentRoute, { slug: equipment.slug }).loader()).data
					?.archivedAt,
			).toBeNull();
			const dataset = await testRoute(scope, datasetRoute, {
				datasetId: String(datasetId),
			}).loader();
			expect(dataset.status).toBe(200);
			const original = await testRoute(scope, originalRoute, {
				fileId: String(dataset.data!.dataset.csvFileId),
			}).loader();
			expect(original.status).toBe(200);
			expect(await original.response!.text()).toContain("2026-08-20T09:00:00Z,1.5");
		});

		test("blocks archiving equipment linked to an active rig", async () => {
			const scope = await setupTestRequestScope();
			const rig = await createTestRig(scope);
			const equipment = await createTestEquipment(scope);
			await createTestPIDNode(scope, rig, { equipmentId: equipment.id });
			const route = testRoute(scope, inventoryRoute, {});

			const result = await route.action({
				kind: "equipment",
				slug: equipment.slug,
				operation: "archive",
			});

			expect(result.status).toBe(409);
			expect(result.data?.archiveError.dependencies).toEqual([
				{ name: rig.name, to: `/inventory/rigs/${rig.slug}/pid` },
			]);
			expect(
				(await testRoute(scope, equipmentRoute, { slug: equipment.slug }).loader()).data
					?.archivedAt,
			).toBeNull();
		});

		test.each(["equipment", "rig"] as const)(
			"checks dependencies added before the %s archive state update",
			async (kind) => {
				const scope = await setupTestRequestScope();
				const restoring = kind === "rig";
				const rig = await createTestRig(scope, {
					metadataArchivedAt: restoring ? new Date() : null,
				});
				const equipment = await createTestEquipment(scope, {
					metadataArchivedAt: restoring ? new Date() : null,
				});
				const entry = restoring ? rig : equipment;
				const db = scope.get(ApplicationDatabase);
				const originalBatch = db.batch.bind(db);
				db.batch = async (statements) => {
					db.batch = originalBatch;
					await createTestPIDNode(scope, rig, { equipmentId: equipment.id });
					return originalBatch(statements);
				};
				const route = testRoute(scope, inventoryRoute, {});

				const result = await route.action({
					kind,
					slug: entry.slug,
					operation: restoring ? "restore" : "archive",
				});

				expect(result.status).toBe(409);
				expect(result.data?.archiveError.dependencies[0]?.to).toBe(
					restoring ? `/inventory/equipment/${equipment.slug}` : `/inventory/rigs/${rig.slug}/pid`,
				);
				const detail = await testRoute(scope, restoring ? rigRoute : equipmentRoute, {
					slug: entry.slug,
				}).loader();
				if (restoring) expect(detail.data?.archivedAt).toBeInstanceOf(Date);
				else expect(detail.data?.archivedAt).toBeNull();
			},
		);

		test("restores a rig when its linked equipment is active", async () => {
			const scope = await setupTestRequestScope();
			const rig = await createTestRig(scope);
			const equipment = await createTestEquipment(scope);
			const node = await createTestPIDNode(scope, rig, { equipmentId: equipment.id });
			await scope
				.get(ApplicationDatabase)
				.update(Rig)
				.set({ metadataArchivedAt: new Date() })
				.where(eq(Rig.id, rig.id))
				.run();
			const route = testRoute(scope, inventoryRoute, {});

			const result = await route.action({ kind: "rig", slug: rig.slug, operation: "restore" });

			expect(result.status).toBe(303);
			expect(
				(await testRoute(scope, rigRoute, { slug: rig.slug }).loader()).data?.archivedAt,
			).toBeNull();
			expect(
				(await testRoute(scope, pidRoute, { slug: rig.slug }).loader()).data?.graph.nodes[0]?.id,
			).toBe(node.id);
		});

		test("requires equipment restoration before rig restoration", async () => {
			const scope = await setupTestRequestScope();
			const rig = await createTestRig(scope);
			const equipment = await createTestEquipment(scope);
			await createTestPIDNode(scope, rig, { equipmentId: equipment.id });
			await scope
				.get(ApplicationDatabase)
				.update(Rig)
				.set({ metadataArchivedAt: new Date() })
				.where(eq(Rig.id, rig.id))
				.run();
			await scope
				.get(ApplicationDatabase)
				.update(Equipment)
				.set({ metadataArchivedAt: new Date() })
				.where(eq(Equipment.id, equipment.id))
				.run();
			const route = testRoute(scope, inventoryRoute, {});

			const result = await route.action({ kind: "rig", slug: rig.slug, operation: "restore" });

			expect(result.status).toBe(409);
			expect(result.data?.archiveError.dependencies[0]?.to).toBe(
				`/inventory/equipment/${equipment.slug}`,
			);
			expect(
				(await testRoute(scope, rigRoute, { slug: rig.slug }).loader()).data?.archivedAt,
			).toBeInstanceOf(Date);
		});

		test.each([
			{ kind: "unknown", slug: "absent", operation: "archive" },
			{ kind: "rig", slug: "", operation: "archive" },
			{ kind: "rig", slug: "absent", operation: "delete" },
			{ kind: "rig", slug: "absent", operation: ["archive", "restore"] },
		])("rejects an invalid request %j", async (fields) => {
			const scope = await setupTestRequestScope();
			const route = testRoute(scope, inventoryRoute, {});

			const result = await route.action(fields);

			expect(result.status).toBe(400);
		});

		test.each([
			["rig", "archive", false, true],
			["rig", "restore", false, false],
			["rig", "archive", true, false],
			["equipment", "archive", false, true],
			["equipment", "restore", false, false],
			["equipment", "archive", true, false],
		] as const)(
			"rejects missing or outdated %s %s requests (archived=%s, missing=%s)",
			async (kind, operation, archived, missing) => {
				const scope = await setupTestRequestScope();
				const metadataArchivedAt = archived ? new Date() : null;
				const entry =
					kind === "rig"
						? await createTestRig(scope, { metadataArchivedAt })
						: await createTestEquipment(scope, { metadataArchivedAt });
				const route = testRoute(scope, inventoryRoute, {});

				const result = await route.action({
					kind,
					slug: missing ? "absent" : entry.slug,
					operation,
				});

				expect(result.status).toBe(404);
			},
		);
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
			expect(html).toContain(`href="/inventory/rigs/${rig.slug}"`);
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
