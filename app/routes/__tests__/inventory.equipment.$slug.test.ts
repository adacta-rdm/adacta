import { describe, expect, test } from "bun:test";

import * as entryRoute from "~/app/routes/inventory.equipment.$slug.tsx";
import {
	createTestEquipment,
	createTestManufacturer,
	createTestProduct,
} from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("inventory.equipment.$slug", () => {
	describe("loader", () => {
		test("takes the equipment name from its linked product", async () => {
			const scope = await setupTestRequestScope();
			const maker = await createTestManufacturer(scope);
			const product = await createTestProduct(scope, maker);
			const equipment = await createTestEquipment(scope, { slug: "local-controller" }, product);

			const result = await testRoute(scope, entryRoute, { slug: equipment.slug }).loader();

			expect(result.data).toMatchObject({
				name: product.name,
				product: { productSlug: product.slug, manufacturerName: maker.name },
			});
		});

		test("responds with 404 for an unknown slug", async () => {
			const scope = await setupTestRequestScope();

			const result = await testRoute(scope, entryRoute, { slug: "absent" }).loader();

			expect(result.status).toBe(404);
		});

		test("returns archived equipment with its archive date", async () => {
			const scope = await setupTestRequestScope();
			const entry = await createTestEquipment(scope, { metadataArchivedAt: new Date() });

			const result = await testRoute(scope, entryRoute, { slug: entry.slug }).loader();

			expect(result.status).toBe(200);
			expect(result.data?.archivedAt).toEqual(entry.metadataArchivedAt);
		});
	});
});
