import { describe, expect, test } from "bun:test";

import * as manufacturerLayout from "~/app/routes/catalog.$manufacturerSlug.tsx";
import { createTestManufacturer, createTestUpload } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("catalog.$manufacturerSlug", () => {
	describe("loader", () => {
		test("returns the manufacturer with the file ID of its logo", async () => {
			const scope = await setupTestRequestScope();
			const { fileId } = await createTestUpload(scope);
			const manufacturer = await createTestManufacturer(scope, { logoFileId: fileId });
			const route = testRoute(scope, manufacturerLayout, {
				manufacturerSlug: manufacturer.slug,
			});

			const result = await route.loader();

			expect(result.status).toBe(200);
			expect(result.data?.manufacturer).toMatchObject({ name: "Bronkhorst", logoFileId: fileId });
		});

		test("answers 404 for an unknown manufacturer", async () => {
			const scope = await setupTestRequestScope();
			const route = testRoute(scope, manufacturerLayout, { manufacturerSlug: "no-such-maker" });

			const result = await route.loader();

			expect(result.status).toBe(404);
		});
	});
});
