import { describe, expect, test } from "bun:test";

import * as batchLayout from "~/app/routes/samples.$batchSlug.tsx";
import { createTestBatch } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("samples.$batchSlug", () => {
	describe("loader", () => {
		test("returns the name of an archived batch", async () => {
			const scope = await setupTestRequestScope();
			const batch = await createTestBatch(scope, { metadataArchivedAt: new Date() });
			const route = testRoute(scope, batchLayout, { batchSlug: batch.slug });

			const result = await route.loader();

			expect(result.status).toBe(200);
			expect(result.data).toEqual({ name: "Pt batch" });
		});

		test("answers 404 for an unknown batch", async () => {
			const scope = await setupTestRequestScope();
			const route = testRoute(scope, batchLayout, { batchSlug: "no-such-batch" });

			const result = await route.loader();

			expect(result.status).toBe(404);
		});
	});
});
