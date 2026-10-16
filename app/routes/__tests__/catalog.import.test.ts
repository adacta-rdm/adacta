import { describe, expect, test } from "bun:test";

import * as importRoute from "~/app/routes/catalog.import.tsx";
import * as entryRoute from "~/app/routes/inventory.$entrySlug.tsx";
import * as inventoryRoute from "~/app/routes/inventory._index.tsx";
import {
	createTestManufacturer,
	createTestProduct,
	createTestSpecification,
	createTestRig,
} from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("catalog import", () => {
	describe("loader", () => {
		test("loads selected active products in the URL order", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			const first = await createTestProduct(scope, maker);
			const second = await createTestProduct(scope, maker, { productNumber: "Second" });
			const archived = await createTestProduct(scope, maker, {
				productNumber: "Archived",
				metadataArchivedAt: new Date(),
			});
			const specification = await createTestSpecification(scope, first);

			const result = await testRoute(scope, importRoute, {}).loader({
				query: { selected: [String(second.id), String(archived.id), String(first.id)] },
			});

			expect(result.status).toBe(200);
			expect(result.data?.products.map((product) => product.id)).toEqual([second.id, first.id]);
			expect(result.data?.products[1]?.specifications).toMatchObject([
				{ id: specification.id, required: true },
			]);
		});

		test.each([["invalid"], ["1", "1"], ["0"]].map((selected) => ({ selected })))(
			"rejects invalid selection %j",
			async ({ selected }) => {
				const scope = await setupTestRequestScope();

				const result = await testRoute(scope, importRoute, {}).loader({ query: { selected } });

				expect(result.status).toBe(400);
			},
		);
	});

	describe("action", () => {
		test("creates equipment, product links, and unit-specific values in one batch", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			const first = await createTestProduct(scope, maker);
			const second = await createTestProduct(scope, maker, { productNumber: "F-201CV-100" });
			const specification = await createTestSpecification(scope, first, { name: "Serial number" });

			const result = await testRoute(scope, importRoute, {}).action({
				productId: [String(first.id), String(second.id)],
				[`entry-${first.id}-name`]: "First controller",
				[`entry-${second.id}-name`]: "Second controller",
				[`entry-${first.id}-serialNumber`]: "A-20",
				[`entry-${first.id}-specification-${specification.id}`]: "A-20",
			});

			expect(result.status).toBe(303);
			const firstDetail = await testRoute(scope, entryRoute, {
				entrySlug: "first-controller",
			}).loader();
			const secondDetail = await testRoute(scope, entryRoute, {
				entrySlug: "second-controller",
			}).loader();
			expect(firstDetail.data?.entry).toMatchObject({
				serialNumber: "A-20",
				product: {
					productNumber: first.productNumber,
					specifications: [{ name: "Serial number", value: "A-20" }],
				},
			});
			expect(secondDetail.data?.entry).toMatchObject({
				serialNumber: null,
				product: { productNumber: second.productNumber },
			});
		});

		test("rejects missing required values without creating any equipment", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			const product = await createTestProduct(scope, maker);
			await createTestSpecification(scope, product);

			const result = await testRoute(scope, importRoute, {}).action({
				productId: String(product.id),
				[`entry-${product.id}-name`]: "Argon controller",
			});

			expect(result.status).toBe(400);
			expect(result.data?.error).toContain("Calibrated range");
			const inventory = await testRoute(scope, inventoryRoute, {}).loader();
			expect(inventory.data?.entries).toHaveLength(0);
		});

		test.each([[], ["invalid"], ["1", "1"], ["0"], ["999999"]].map((productId) => ({ productId })))(
			"rejects unavailable or invalid products %j",
			async ({ productId }) => {
				const scope = await setupTestRequestScope();

				const result = await testRoute(scope, importRoute, {}).action({ productId });

				expect(result.status).toBe(400);
			},
		);

		test("rolls back every selected unit when a serial number is already in use", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			const first = await createTestProduct(scope, maker);
			const second = await createTestProduct(scope, maker, { productNumber: "Second" });
			await createTestRig(scope, { kind: "equipment", name: "Existing", serialNumber: "Taken" });

			const result = await testRoute(scope, importRoute, {}).action({
				productId: [String(first.id), String(second.id)],
				[`entry-${first.id}-name`]: "First",
				[`entry-${second.id}-name`]: "Second",
				[`entry-${second.id}-serialNumber`]: "Taken",
			});

			expect(result.status).toBe(400);
			const inventory = await testRoute(scope, inventoryRoute, {}).loader();
			expect(inventory.data?.entries.map((entry) => entry.name)).toEqual(["Existing"]);
		});

		test("keeps equipment addresses unique when a rig has the requested name", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			const product = await createTestProduct(scope, maker);
			await createTestRig(scope, { name: "Controller" });

			const result = await testRoute(scope, importRoute, {}).action({
				productId: String(product.id),
				[`entry-${product.id}-name`]: "Controller",
			});

			expect(result.status).toBe(303);
			const detail = await testRoute(scope, entryRoute, { entrySlug: "controller-2" }).loader();
			expect(detail.data?.entry.kind).toBe("equipment");
		});
		test("creates equipment and its product link in one batch", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			const product = await createTestProduct(scope, maker);
			const route = testRoute(scope, importRoute, {});

			const result = await route.action({
				productId: String(product.id),
				[`entry-${product.id}-name`]: "Argon controller",
				[`entry-${product.id}-serialNumber`]: "A-20",
			});

			expect(result.status).toBe(303);
			expect(result.location).toBe("/inventory");
			const detail = await testRoute(scope, entryRoute, { entrySlug: "argon-controller" }).loader();
			expect(detail.data?.entry).toMatchObject({
				name: "Argon controller",
				kind: "equipment",
				serialNumber: "A-20",
				product: {
					name: product.name,
					productNumber: product.productNumber,
					manufacturerName: maker.name,
				},
			});
			const inventory = await testRoute(scope, inventoryRoute, {}).loader();
			expect(inventory.data?.entries).toHaveLength(1);
		});

		test("stores every value when a product requests forty specifications", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			const product = await createTestProduct(scope, maker, {}, [
				{ name: "Accuracy", value: "0.5%" },
			]);
			const fields: Record<string, string> = {
				productId: String(product.id),
				[`entry-${product.id}-name`]: "Range controller",
			};
			const expected = [{ name: "Accuracy", value: "0.5%" }];
			for (let position = 1; position <= 40; position++) {
				const specification = await createTestSpecification(scope, product, {
					position,
					name: `Range ${position}`,
				});
				fields[`entry-${product.id}-specification-${specification.id}`] = `${position} ml/min`;
				expected.push({ name: specification.name, value: `${position} ml/min` });
			}

			const result = await testRoute(scope, importRoute, {}).action(fields);

			expect(result.status).toBe(303);
			const detail = await testRoute(scope, entryRoute, { entrySlug: "range-controller" }).loader();
			expect(detail.data?.entry.product?.specifications).toEqual(expected);
		});
	});
});
