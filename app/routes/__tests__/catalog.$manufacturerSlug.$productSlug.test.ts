import { describe, expect, test } from "bun:test";

import * as productPage from "~/app/routes/catalog.$manufacturerSlug.$productSlug.tsx";
import {
	createTestChannel,
	createTestManufacturer,
	createTestProduct,
	createTestSeries,
} from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("catalog.$manufacturerSlug.$productSlug", () => {
	describe("loader", () => {
		test("marks the specifications the family shares", async () => {
			const scope = await setupTestRequestScope();
			const manufacturer = await createTestManufacturer(scope);
			const series = await createTestSeries(scope, manufacturer);
			const product = await createTestProduct(
				scope,
				manufacturer,
				{ productNumber: "F-201CV-020", seriesId: series.id },
				[
					{ name: "Calibration gas", value: "N₂" },
					{ name: "Accuracy", value: "±0.5%" },
				],
			);
			await createTestProduct(
				scope,
				manufacturer,
				{ productNumber: "F-201CV-100", seriesId: series.id },
				[
					{ name: "Calibration gas", value: "H₂" },
					{ name: "Accuracy", value: "±0.5%" },
				],
			);
			await createTestChannel(scope, product);
			const route = testRoute(scope, productPage, {
				manufacturerSlug: manufacturer.slug,
				productSlug: product.slug,
			});

			const result = await route.loader();

			const { series: family, specifications, channels } = result.data!;
			expect(family?.name).toBe("EL-FLOW Select");

			// Both members state the same accuracy, so it is shared. The calibration
			// gas differs, so it belongs to this product alone.
			expect(specifications).toEqual([
				{ name: "Calibration gas", value: "N₂", shared: false },
				{ name: "Accuracy", value: "±0.5%", shared: true },
			]);

			expect(channels).toEqual([
				expect.objectContaining({
					key: "flow",
					role: "measurement",
					quantityKindId: "VolumeFlowRate",
				}),
			]);
		});

		test("answers 404 for an unknown product", async () => {
			const scope = await setupTestRequestScope();
			const manufacturer = await createTestManufacturer(scope);
			const route = testRoute(scope, productPage, {
				manufacturerSlug: manufacturer.slug,
				productSlug: "no-such-product",
			});

			const result = await route.loader();

			expect(result.status).toBe(404);
		});
	});
});
