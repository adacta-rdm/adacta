import { describe, expect, test } from "bun:test";

import * as detailRoute from "~/app/routes/files.measurements.$datasetId.tsx";
import { createTestMeasurementDataset } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("measurement detail loader", () => {
	test("shows the stored measurement row and source metadata", async () => {
		const scope = await setupTestRequestScope();
		const { datasetId, rig } = await createTestMeasurementDataset(scope);
		const route = testRoute(scope, detailRoute, { datasetId: String(datasetId) });

		const result = await route.loader();

		expect(result.data?.dataset).toMatchObject({ id: datasetId, csvName: "flow.csv", rowCount: 1 });
		expect(result.data?.rig).toMatchObject({ slug: rig.slug, name: rig.name });
		expect(result.data?.rows).toEqual([["2026-08-20T09:00:00.000Z", "1.5"]]);
		expect(result.data?.sidecarName).toBe("flow.toml");
	});

	test("rejects an unknown measurement", async () => {
		const scope = await setupTestRequestScope();
		const route = testRoute(scope, detailRoute, { datasetId: "1234567890123" });

		const result = await route.loader();

		expect(result.status).toBe(404);
	});

	test("rejects a page outside the dataset", async () => {
		const scope = await setupTestRequestScope();
		const { datasetId } = await createTestMeasurementDataset(scope);
		const route = testRoute(scope, detailRoute, { datasetId: String(datasetId) });

		const result = await route.loader({ query: { page: "2" } });

		expect(result.status).toBe(404);
	});
});
