import { describe, expect, test } from "bun:test";

import * as catalogIndex from "~/app/routes/catalog._index.tsx";
import {
	createTestManufacturer,
	createTestProduct,
	createTestSeries,
	createTestUpload,
} from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("catalog._index", () => {
	describe("loader", () => {
		test("lists every product with its family and image, ordered by manufacturer and product number", async () => {
			const scope = await setupTestRequestScope();
			const { fileId } = await createTestUpload(scope);
			const knf = await createTestManufacturer(scope, { name: "KNF" });
			const bronkhorst = await createTestManufacturer(scope, { name: "Bronkhorst" });
			const series = await createTestSeries(scope, bronkhorst);
			await createTestProduct(scope, knf, { productNumber: "N86" });
			await createTestProduct(scope, bronkhorst, {
				productNumber: "F-201CV-100",
				seriesId: series.id,
			});
			await createTestProduct(scope, bronkhorst, {
				productNumber: "F-201CV-020",
				seriesId: series.id,
				imageFileId: fileId,
			});
			const route = testRoute(scope, catalogIndex, {});

			const result = await route.loader();

			expect(result.data?.products).toEqual([
				expect.objectContaining({
					productNumber: "F-201CV-020",
					manufacturerName: "Bronkhorst",
					seriesName: "EL-FLOW Select",
					imageFileId: fileId,
				}),
				expect.objectContaining({ productNumber: "F-201CV-100", imageFileId: null }),
				// A product in no series still appears, with nothing in that column.
				expect.objectContaining({ productNumber: "N86", seriesName: null }),
			]);
		});
	});
});
