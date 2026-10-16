import { describe, expect, test } from "bun:test";

import * as productRoute from "~/app/routes/catalog.$manufacturerSlug.$productSlug.tsx";
import * as entryRoute from "~/app/routes/inventory.$entrySlug.tsx";
import * as inventoryRoute from "~/app/routes/inventory._index.tsx";
import * as newRoute from "~/app/routes/inventory.new.tsx";
import { createTestManufacturer, createTestRig } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("new inventory equipment", () => {
	describe("loader", () => {
		test("lists active manufacturers for the form", async () => {
			const scope = await setupTestRequestScope();
			await createTestManufacturer(scope, { name: "Zeta Instruments" });
			await createTestManufacturer(scope, { name: "Alpha Instruments" });
			await createTestManufacturer(scope, { name: "Archived", metadataArchivedAt: new Date() });

			const result = await testRoute(scope, newRoute, {}).loader();

			expect(result.data?.manufacturers.map((maker) => maker.name)).toEqual([
				"Alpha Instruments",
				"Zeta Instruments",
			]);
		});
	});

	describe("action", () => {
		test("creates an unknown manufacturer and incomplete product identity", async () => {
			const scope = await setupTestRequestScope();

			const result = await testRoute(scope, newRoute, {}).action({
				entryName: "Bench controller",
				productName: "Flow controller",
				manufacturerId: "new",
				manufacturerName: "Unknown manufacturer",
			});

			expect(result.status).toBe(303);
			const detail = await testRoute(scope, entryRoute, { entrySlug: "bench-controller" }).loader();
			expect(detail.data?.entry.product).toMatchObject({
				manufacturerName: "Unknown manufacturer",
				productNumber: null,
				subtitle: null,
				origin: "user",
			});
		});

		test("rejects a new manufacturer that already exists", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);

			const result = await testRoute(scope, newRoute, {}).action({
				entryName: "Controller",
				productName: "Flow controller",
				manufacturerId: "new",
				manufacturerName: maker.name,
			});

			expect(result.status).toBe(400);
			const inventory = await testRoute(scope, inventoryRoute, {}).loader();
			expect(inventory.data?.entries).toHaveLength(0);
		});

		test("keeps product and entry slugs unique", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			const route = testRoute(scope, newRoute, {});
			const values = {
				entryName: "Argon controller",
				productName: "Flow controller",
				manufacturerId: String(maker.id),
			};
			await route.action(values);

			const result = await route.action(values);

			expect(result.location).toBe("/inventory/argon-controller-2");
			const detail = await testRoute(scope, entryRoute, {
				entrySlug: "argon-controller-2",
			}).loader();
			expect(detail.data?.entry.product?.productSlug).toBe("flow-controller-2");
			const model = await testRoute(scope, productRoute, {
				manufacturerSlug: maker.slug,
				productSlug: "flow-controller-2",
			}).loader();
			expect(model.data?.product.name).toBe("Flow controller");
		});

		test("keeps generated slugs unique across rigs and equipment", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			await createTestRig(scope, { name: "Controller" });

			const result = await testRoute(scope, newRoute, {}).action({
				entryName: "Controller",
				productName: "Flow controller",
				manufacturerId: String(maker.id),
			});

			expect(result.location).toBe("/inventory/controller-2");
			const detail = await testRoute(scope, entryRoute, { entrySlug: "controller-2" }).loader();
			expect(detail.data?.entry.kind).toBe("equipment");
		});

		test.each([
			{ entryName: "", productName: "Product", manufacturerId: "new", manufacturerName: "Maker" },
			{ entryName: "Unit", productName: "", manufacturerId: "new", manufacturerName: "Maker" },
			{
				entryName: "!!!",
				productName: "Product",
				manufacturerId: "new",
				manufacturerName: "Maker",
			},
			{ entryName: "Unit", productName: "Product", manufacturerId: "", manufacturerName: "" },
			{
				entryName: "Unit",
				productName: "Product",
				manufacturerId: "invalid",
				manufacturerName: "",
			},
			{ entryName: "Unit", productName: "Product", manufacturerId: "999999", manufacturerName: "" },
			{ entryName: "Unit", productName: "Product", manufacturerId: "new", manufacturerName: "" },
		])("rejects invalid manual entries %j", async (values) => {
			const scope = await setupTestRequestScope();

			const result = await testRoute(scope, newRoute, {}).action(values);

			expect(result.status).toBe(400);
		});

		test("rejects duplicate serial numbers without creating a product", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			await createTestRig(scope, { kind: "equipment", name: "Existing", serialNumber: "Taken" });

			const result = await testRoute(scope, newRoute, {}).action({
				entryName: "Unit",
				productName: "Product",
				manufacturerId: String(maker.id),
				serialNumber: "Taken",
			});

			expect(result.status).toBe(400);
			const missingProduct = await testRoute(scope, productRoute, {
				manufacturerSlug: maker.slug,
				productSlug: "product",
			}).loader();
			expect(missingProduct.status).toBe(404);
		});
		test("creates a user product and its first equipment entry", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			const route = testRoute(scope, newRoute, {});

			const result = await route.action({
				entryName: "Argon controller",
				serialNumber: "A-20",
				productName: "EL-FLOW Select",
				productNumber: "F-201CV-020",
				description: "Controls argon flow.",
				manufacturerId: String(maker.id),
			});

			expect(result.status).toBe(303);
			expect(result.location).toBe("/inventory/argon-controller");
			const detail = await testRoute(scope, entryRoute, { entrySlug: "argon-controller" }).loader();
			expect(detail.data?.entry).toMatchObject({
				name: "Argon controller",
				serialNumber: "A-20",
				kind: "equipment",
				product: {
					manufacturerName: maker.name,
					productSlug: "f-201cv-020",
					name: "EL-FLOW Select",
					productNumber: "F-201CV-020",
					description: "Controls argon flow.",
					origin: "user",
				},
			});
		});
	});
});
