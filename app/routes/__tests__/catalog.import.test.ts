import { describe, expect, test } from "bun:test";

import * as importRoute from "~/app/routes/catalog.import.tsx";
import * as entryRoute from "~/app/routes/inventory.equipment.$slug.tsx";
import { listedInventory } from "~/app/testUtils/listedInventory.ts";
import {
	createTestManufacturer,
	createTestProduct,
	createTestSpecification,
	createTestRig,
	createTestEquipment,
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
		test("imports every selected product as equipment", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			const products = [];
			for (let index = 0; index < 120; index++) {
				products.push(
					await createTestProduct(scope, maker, {
						name: `Model ${index}`,
						productNumber: `MODEL-${index}`,
					}),
				);
			}

			const result = await testRoute(scope, importRoute, {}).action({
				productId: products.map((product) => String(product.id)),
			});

			expect(result.status).toBe(303);
			const names = (await listedInventory(scope)).map((entry) => entry.name);
			expect(names.sort((left, right) => left.localeCompare(right))).toEqual(
				products.map((product) => product.name).sort((left, right) => left.localeCompare(right)),
			);
		});

		test("accepts the same serial number for a different product", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			const first = await createTestProduct(scope, maker);
			const second = await createTestProduct(scope, maker, { productNumber: "Second" });
			await createTestEquipment(scope, { slug: "existing", serialNumber: "12345" }, first);

			const result = await testRoute(scope, importRoute, {}).action({
				productId: String(second.id),
				[`entry-${second.id}-serialNumber`]: "12345",
			});

			expect(result.status).toBe(303);
			const detail = await testRoute(scope, entryRoute, { slug: "controller" }).loader();
			expect(detail.data).toMatchObject({ serialNumber: "12345" });
		});

		test("imports another unit after more than five units of the model already exist", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			const product = await createTestProduct(scope, maker);
			for (let unit = 1; unit <= 6; unit++) {
				await createTestEquipment(
					scope,
					{ slug: unit === 1 ? "controller" : `controller-${unit}` },
					product,
				);
			}

			const result = await testRoute(scope, importRoute, {}).action({
				productId: String(product.id),
			});

			expect(result.status).toBe(303);
			const detail = await testRoute(scope, entryRoute, { slug: "controller-7" }).loader();
			expect(detail.data).toMatchObject({
				name: product.name,
				product: { productSlug: product.slug },
			});
		});

		test("assigns different addresses to concurrent imports of one model", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			const product = await createTestProduct(scope, maker);
			const route = testRoute(scope, importRoute, {});

			const results = await Promise.all([
				route.action({ productId: String(product.id) }),
				route.action({ productId: String(product.id) }),
			]);

			expect(results.map((result) => result.status)).toEqual([303, 303]);
			const slugs = (await listedInventory(scope)).map((entry) => entry.slug);
			expect(slugs.sort((left, right) => left.localeCompare(right))).toEqual([
				"controller",
				"controller-2",
			]);
		});

		test("creates equipment, product links, and unit-specific values in one batch", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			const first = await createTestProduct(scope, maker);
			const second = await createTestProduct(scope, maker, { productNumber: "F-201CV-100" });
			const specification = await createTestSpecification(scope, first, { name: "Serial number" });

			const result = await testRoute(scope, importRoute, {}).action({
				productId: [String(first.id), String(second.id)],
				[`entry-${first.id}-serialNumber`]: "A-20",
				[`entry-${first.id}-specification-${specification.id}`]: "A-20",
			});

			expect(result.status).toBe(303);
			const firstDetail = await testRoute(scope, entryRoute, {
				slug: "controller",
			}).loader();
			const secondDetail = await testRoute(scope, entryRoute, {
				slug: "controller-2",
			}).loader();
			expect(firstDetail.data).toMatchObject({
				serialNumber: "A-20",
				product: {
					productNumber: first.productNumber,
				},
				specifications: [{ name: "Serial number", value: "A-20" }],
			});
			expect(secondDetail.data).toMatchObject({
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
			});

			expect(result.status).toBe(400);
			expect(result.data?.error).toContain("Calibrated range");
			expect(await listedInventory(scope)).toEqual([]);
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
			await createTestEquipment(scope, { slug: "existing", serialNumber: "Taken" }, second);

			const result = await testRoute(scope, importRoute, {}).action({
				productId: [String(first.id), String(second.id)],
				[`entry-${second.id}-serialNumber`]: "Taken",
			});

			expect(result.status).toBe(400);
			const slugs = (await listedInventory(scope)).map((entry) => entry.slug);
			expect(slugs).toEqual(["existing"]);
		});

		test("uses an equipment slug even when an archived rig has the same slug", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			const product = await createTestProduct(scope, maker);
			await createTestRig(scope, { name: "Controller", metadataArchivedAt: new Date() });

			const result = await testRoute(scope, importRoute, {}).action({
				productId: String(product.id),
			});

			expect(result.status).toBe(303);
			const detail = await testRoute(scope, entryRoute, { slug: "controller" }).loader();
			expect(detail.status).toBe(200);
		});

		test("stores every value when a product requests forty specifications", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			const product = await createTestProduct(scope, maker, {}, [
				{ name: "Accuracy", value: "0.5%" },
			]);
			const fields: Record<string, string> = {
				productId: String(product.id),
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
			const detail = await testRoute(scope, entryRoute, { slug: "controller" }).loader();
			expect(detail.data?.specifications).toEqual(expected);
		});
	});
});
