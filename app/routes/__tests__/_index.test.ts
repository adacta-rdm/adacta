import { describe, expect, test } from "bun:test";

import * as indexRoute from "~/app/routes/_index.tsx";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("_index", () => {
	describe("loader", () => {
		test("redirects to inventory", async () => {
			const scope = await setupTestRequestScope();
			const route = testRoute(scope, indexRoute, {});

			const result = await route.loader();

			expect(result.status).toBe(302);
			expect(result.location).toBe("/inventory");
		});
	});
});
