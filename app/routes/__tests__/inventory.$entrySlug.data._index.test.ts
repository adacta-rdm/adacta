import { describe, expect, test } from "bun:test";

import * as dataRoute from "~/app/routes/inventory.$entrySlug.data._index.tsx";
import { createTestDataset, createTestRig } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("rig data loader", () => {
	test("lists datasets imported for the rig", async () => {
		const scope = await setupTestRequestScope();
		const { datasetId, rig } = await createTestDataset(scope);
		const route = testRoute(scope, dataRoute, { entrySlug: rig.slug });

		const result = await route.loader();

		expect(result.data?.datasets).toMatchObject([
			{ id: datasetId, csvName: "flow.csv", rowCount: 1, operatorEmail: "test.user@example.com" },
		]);
	});

	test("excludes datasets imported for another rig", async () => {
		const scope = await setupTestRequestScope();
		await createTestDataset(scope);
		const rig = await createTestRig(scope, { name: "Other rig" });
		const route = testRoute(scope, dataRoute, { entrySlug: rig.slug });

		const result = await route.loader();

		expect(result.data?.datasets).toEqual([]);
	});

	test("rejects an unknown rig", async () => {
		const scope = await setupTestRequestScope();
		const route = testRoute(scope, dataRoute, { entrySlug: "unknown-rig" });

		const result = await route.loader();

		expect(result.status).toBe(404);
	});
});
