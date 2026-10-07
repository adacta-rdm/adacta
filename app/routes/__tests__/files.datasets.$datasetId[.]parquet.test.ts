import { describe, expect, test } from "bun:test";

import * as downloadRoute from "~/app/routes/files.datasets.$datasetId[.]parquet.ts";
import { createTestMeasurementDataset } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("Parquet download loader", () => {
	test("returns the dataset as a named Parquet attachment", async () => {
		const scope = await setupTestRequestScope();
		const { datasetId } = await createTestMeasurementDataset(scope);
		const route = testRoute(scope, downloadRoute, { datasetId: String(datasetId) });

		const result = await route.loader();

		expect(result.status).toBe(200);
		expect(result.response?.headers.get("Content-Type")).toBe("application/vnd.apache.parquet");
		expect(result.response?.headers.get("Content-Disposition")).toBe(
			`attachment; filename="measurement-${datasetId}.parquet"`,
		);
		expect((await result.response!.arrayBuffer()).byteLength).toBeGreaterThan(0);
	});

	test("rejects a dataset that does not exist", async () => {
		const scope = await setupTestRequestScope();
		const route = testRoute(scope, downloadRoute, { datasetId: "1234567890123" });

		const result = await route.loader();

		expect(result.status).toBe(404);
	});
});
