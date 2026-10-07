import { describe, expect, test } from "bun:test";

import * as samplesRoute from "~/app/routes/samples.tsx";
import { createTestBatch } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("samples", () => {
	describe("loader", () => {
		test("groups active batches by material and support", async () => {
			const scope = await setupTestRequestScope();
			const batch = await createTestBatch(scope, { activeMaterial: "Pt", support: "Al2O3" });
			await createTestBatch(scope, { name: "Archived batch", metadataArchivedAt: new Date() });
			const route = testRoute(scope, samplesRoute, {});

			const result = await route.loader();

			expect(result.status).toBe(200);
			expect(result.data?.batchGroups[0]?.supports[0]?.batches.map((row) => row.slug)).toEqual([
				batch.slug,
			]);
		});
	});
});
