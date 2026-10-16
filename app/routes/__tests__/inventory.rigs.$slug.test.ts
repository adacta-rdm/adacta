import { describe, expect, test } from "bun:test";

import * as equipmentRoute from "~/app/routes/inventory.equipment.$slug.tsx";
import * as entryRoute from "~/app/routes/inventory.rigs.$slug.tsx";
import { createTestEquipment, createTestRig } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("inventory.rigs.$slug", () => {
	describe("loader", () => {
		test("returns the rig that carries the slug", async () => {
			const scope = await setupTestRequestScope();
			const rig = await createTestRig(scope, {
				name: "Methanation Test Stand",
				building: "B7",
				room: "12",
			});

			const result = await testRoute(scope, entryRoute, { slug: rig.slug }).loader();

			expect(result.data).toMatchObject({
				name: rig.name,
				location: { building: "B7", room: "12", position: null },
			});
		});

		test("reads a rig and equipment independently when they share a slug", async () => {
			const scope = await setupTestRequestScope();
			const rig = await createTestRig(scope, { slug: "balance", name: "Balance rig" });
			const equipment = await createTestEquipment(scope, { slug: "balance", serialNumber: "B-1" });

			const rigResult = await testRoute(scope, entryRoute, { slug: rig.slug }).loader();
			const equipmentResult = await testRoute(scope, equipmentRoute, {
				slug: equipment.slug,
			}).loader();

			expect(rigResult.status).toBe(200);
			expect(rigResult.data).toMatchObject({
				slug: "balance",
				name: "Balance rig",
			});
			expect(equipmentResult.status).toBe(200);
			expect(equipmentResult.data).toMatchObject({
				slug: "balance",
				serialNumber: "B-1",
			});
		});

		test("responds with 404 for an unknown slug", async () => {
			const scope = await setupTestRequestScope();

			const result = await testRoute(scope, entryRoute, { slug: "absent" }).loader();

			expect(result.status).toBe(404);
		});

		test("ignores an archived rig", async () => {
			const scope = await setupTestRequestScope();
			const entry = await createTestRig(scope, { metadataArchivedAt: new Date() });

			const result = await testRoute(scope, entryRoute, { slug: entry.slug }).loader();

			expect(result.status).toBe(404);
		});
	});
});
