import { describe, expect, test } from "bun:test";

import * as manufacturerIndex from "~/app/routes/catalog.$manufacturerSlug._index.tsx";
import {
	createTestManufacturer,
	createTestProduct,
	createTestSeries,
	createTestUpload,
} from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("catalog.$manufacturerSlug._index", () => {
	describe("loader", () => {
		test("puts the lines that differ in the table and the rest above it", async () => {
			const scope = await setupTestRequestScope();
			const manufacturer = await createTestManufacturer(scope);
			const series = await createTestSeries(scope, manufacturer);
			await createTestProduct(
				scope,
				manufacturer,
				{ productNumber: "F-201CV-020", seriesId: series.id, seriesPosition: 0 },
				[
					{ name: "Calibration gas", value: "N₂" },
					{ name: "Accuracy", value: "±0.5%" },
				],
			);
			await createTestProduct(
				scope,
				manufacturer,
				{ productNumber: "F-201CV-100", seriesId: series.id, seriesPosition: 1 },
				[
					{ name: "Calibration gas", value: "H₂" },
					{ name: "Accuracy", value: "±0.5%" },
				],
			);
			await createTestProduct(scope, manufacturer, { productNumber: "N86" });
			const route = testRoute(scope, manufacturerIndex, { manufacturerSlug: manufacturer.slug });

			const result = await route.loader();

			const { series: families, standalone } = result.data!;
			expect(families).toHaveLength(1);
			expect(families[0]?.products.map((product) => product.productNumber)).toEqual([
				"F-201CV-020",
				"F-201CV-100",
			]);

			// Accuracy is stated the same way by both, so it belongs above the table.
			// The calibration gas separates them, so it becomes a column.
			expect(families[0]?.products[0]?.specifications).toEqual([
				{ name: "Calibration gas", value: "N₂" },
				{ name: "Accuracy", value: "±0.5%" },
			]);

			expect(standalone.map((product) => product.productNumber)).toEqual(["N86"]);
		});

		test("shows the photograph of the first member for the series", async () => {
			const scope = await setupTestRequestScope();
			const { fileId } = await createTestUpload(scope);
			const manufacturer = await createTestManufacturer(scope);
			const series = await createTestSeries(scope, manufacturer);
			await createTestProduct(scope, manufacturer, {
				productNumber: "F-201CV-100",
				seriesId: series.id,
				seriesPosition: 1,
			});
			await createTestProduct(scope, manufacturer, {
				productNumber: "F-201CV-020",
				seriesId: series.id,
				seriesPosition: 0,
				imageFileId: fileId,
			});
			const route = testRoute(scope, manufacturerIndex, { manufacturerSlug: manufacturer.slug });

			const result = await route.loader();

			expect(result.data?.series[0]?.imageFileId).toBe(fileId);
		});

		test("answers 404 for an unknown manufacturer", async () => {
			const scope = await setupTestRequestScope();
			const route = testRoute(scope, manufacturerIndex, { manufacturerSlug: "no-such-maker" });

			const result = await route.loader();

			expect(result.status).toBe(404);
		});
	});
});
