import { describe, expect, test } from "bun:test";

import * as filesRoute from "~/app/routes/files._index.tsx";
import { createTestMeasurementDataset, createTestUpload } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("files index loader", () => {
	test("shows empty sections before files are uploaded", async () => {
		const scope = await setupTestRequestScope();
		const route = testRoute(scope, filesRoute, {});

		const result = await route.loader();

		expect(result.data).toEqual({ measurements: [], uploads: [] });
	});

	test("lists imported measurements and their original upload", async () => {
		const scope = await setupTestRequestScope();
		const { datasetId, uploadId } = await createTestMeasurementDataset(scope);
		const route = testRoute(scope, filesRoute, {});

		const result = await route.loader();

		expect(result.data?.measurements).toMatchObject([
			{ id: datasetId, csvName: "flow.csv", rowCount: 1 },
		]);
		expect(result.data?.uploads).toMatchObject([
			{ id: uploadId, fileNames: ["flow.csv", "flow.toml"] },
		]);
	});

	test("lists an upload that has not been imported", async () => {
		const scope = await setupTestRequestScope();
		const { uploadId } = await createTestUpload(scope);
		const route = testRoute(scope, filesRoute, {});

		const result = await route.loader();

		expect(result.data?.measurements).toEqual([]);
		expect(result.data?.uploads).toMatchObject([
			{ id: uploadId, fileNames: ["measurement ä.csv"] },
		]);
	});
});
