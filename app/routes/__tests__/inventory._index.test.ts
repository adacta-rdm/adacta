import { describe, expect, test } from "bun:test";

import * as inventoryRoute from "~/app/routes/inventory._index.tsx";
import {
	createTestEquipment,
	createTestManufacturer,
	createTestProduct,
	createTestRig,
} from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("inventory index", () => {
	describe("loader", () => {
		test("lists active entries with their source catalog model", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			const model = await createTestProduct(scope, maker);
			await createTestEquipment(
				scope,
				{ name: "Mass flow controller", serialNumber: "A-20" },
				model,
			);
			await createTestRig(scope, { name: "Methanation test stand" });
			await createTestRig(scope, { name: "Archived rig", metadataArchivedAt: new Date() });

			const result = await testRoute(scope, inventoryRoute, {}).loader();

			expect(result.data?.entries).toMatchObject([
				{
					name: "Mass flow controller",
					kind: "equipment",
					serialNumber: "A-20",
					product: {
						manufacturerSlug: maker.slug,
						manufacturerName: maker.name,
						productSlug: model.slug,
						name: model.name,
						productNumber: model.productNumber,
						imageFileId: null,
						origin: "catalog",
					},
				},
				{ name: "Methanation test stand", kind: "rig", product: null },
			]);
		});

		test("matches physical and catalog identifiers", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			const model = await createTestProduct(scope, maker);
			await createTestEquipment(
				scope,
				{ serialNumber: "A-20", locationBuildingIdentifier: "B7" },
				model,
			);
			await createTestRig(scope);

			const result = await testRoute(scope, inventoryRoute, {}).loader({
				query: { q: "B7 bronkhorst A-20" },
			});

			expect(result.data?.entries).toMatchObject([{ kind: "equipment", serialNumber: "A-20" }]);
		});
	});
});
