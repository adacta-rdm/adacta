import { describe, expect, test } from "bun:test";

import * as productRoute from "~/app/routes/catalog.$manufacturerSlug.$productSlug.tsx";
import * as entryRoute from "~/app/routes/inventory.equipment.$slug.tsx";
import * as newRoute from "~/app/routes/inventory.new.tsx";
import * as rigRoute from "~/app/routes/inventory.rigs.$slug.tsx";
import { listedInventory } from "~/app/testUtils/listedInventory.ts";
import {
	createTestEquipment,
	createTestManufacturer,
	createTestRig,
} from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("inventory.new", () => {
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
		test("creates a rig without catalog fields and opens its rig address", async () => {
			const scope = await setupTestRequestScope();

			const result = await testRoute(scope, newRoute, {}).action({
				kind: "rig",
				entryName: "Synthesis rig",
			});

			expect(result.location).toBe("/inventory/rigs/synthesis-rig");
			const detail = await testRoute(scope, rigRoute, { slug: "synthesis-rig" }).loader();
			expect(detail.data).toMatchObject({
				name: "Synthesis rig",
			});
		});

		test("numbers a rig slug already reserved by an archived rig", async () => {
			const scope = await setupTestRequestScope();
			await createTestRig(scope, { slug: "controller", metadataArchivedAt: new Date() });

			const result = await testRoute(scope, newRoute, {}).action({
				kind: "rig",
				entryName: "Controller",
			});

			expect(result.location).toBe("/inventory/rigs/controller-2");
			const detail = await testRoute(scope, rigRoute, { slug: "controller-2" }).loader();
			expect(detail.status).toBe(200);
		});

		test.each([
			{ kind: "other", entryName: "" },
			{ kind: "rig", entryName: "" },
			{ kind: "rig", entryName: "!!!" },
		])("rejects invalid rig entries %j", async (values) => {
			const scope = await setupTestRequestScope();

			const result = await testRoute(scope, newRoute, {}).action(values);

			expect(result.status).toBe(400);
		});

		test("creates an unknown manufacturer and incomplete product identity", async () => {
			const scope = await setupTestRequestScope();

			const result = await testRoute(scope, newRoute, {}).action({
				productName: "Flow controller",
				manufacturerId: "new",
				manufacturerName: "Unknown manufacturer",
			});

			expect(result.status).toBe(303);
			const detail = await testRoute(scope, entryRoute, {
				slug: "flow-controller",
			}).loader();
			expect(detail.data?.product).toMatchObject({
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
				productName: "Flow controller",
				manufacturerId: "new",
				manufacturerName: maker.name,
			});

			expect(result.status).toBe(400);
			expect(await listedInventory(scope)).toEqual([]);
		});

		test("numbers equipment slugs reserved by active and archived units", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			const route = testRoute(scope, newRoute, {});
			const values = {
				productName: "Flow controller",
				manufacturerId: String(maker.id),
			};
			await createTestEquipment(scope, { slug: "flow-controller", metadataArchivedAt: new Date() });
			await route.action(values);

			const result = await route.action(values);

			expect(result.location).toBe("/inventory/equipment/flow-controller-3");
			const detail = await testRoute(scope, entryRoute, {
				slug: "flow-controller-3",
			}).loader();
			expect(detail.data?.product?.productSlug).toBe("flow-controller-2");
			const model = await testRoute(scope, productRoute, {
				manufacturerSlug: maker.slug,
				productSlug: "flow-controller-2",
			}).loader();
			expect(model.data?.product.name).toBe("Flow controller");
		});

		test.each(
			[
				{
					productName: "Product",
					productNumber: "!!!",
					manufacturerId: "new",
					manufacturerName: "Maker",
				},
				{ productName: "", manufacturerId: "new", manufacturerName: "Maker" },
				{
					productName: "!!!",
					manufacturerId: "new",
					manufacturerName: "Maker",
				},
				{ productName: "Product", manufacturerId: "", manufacturerName: "" },
				{
					productName: "Product",
					manufacturerId: "invalid",
					manufacturerName: "",
				},
				{ productName: "Product", manufacturerId: "999999", manufacturerName: "" },
				{ productName: "Product", manufacturerId: "new", manufacturerName: "" },
			].map((values) => ({ ...values, productNumber: values.productNumber ?? "" })),
		)("rejects invalid manual entries %j", async (values) => {
			const scope = await setupTestRequestScope();

			const result = await testRoute(scope, newRoute, {}).action(values);

			expect(result.status).toBe(400);
		});

		test("accepts the same serial number for a different product", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			await createTestEquipment(scope, { serialNumber: "Taken" });

			const result = await testRoute(scope, newRoute, {}).action({
				productName: "Product",
				manufacturerId: String(maker.id),
				serialNumber: "Taken",
			});

			expect(result.status).toBe(303);
			const missingProduct = await testRoute(scope, productRoute, {
				manufacturerSlug: maker.slug,
				productSlug: "product",
			}).loader();
			expect(missingProduct.data?.product.name).toBe("Product");
			const detail = await testRoute(scope, entryRoute, { slug: "product" }).loader();
			expect(detail.data?.serialNumber).toBe("Taken");
		});
		test("creates a user product and its first equipment entry", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			const route = testRoute(scope, newRoute, {});

			const result = await route.action({
				serialNumber: "A-20",
				productName: "EL-FLOW Select",
				productNumber: "F-201CV-020",
				description: "Controls argon flow.",
				manufacturerId: String(maker.id),
			});

			expect(result.status).toBe(303);
			expect(result.location).toBe("/inventory/equipment/el-flow-select");
			const detail = await testRoute(scope, entryRoute, {
				slug: "el-flow-select",
			}).loader();
			expect(detail.data).toMatchObject({
				name: "EL-FLOW Select",
				serialNumber: "A-20",
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
