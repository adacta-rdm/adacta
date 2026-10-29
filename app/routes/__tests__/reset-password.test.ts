import { describe, expect, test } from "bun:test";

import * as routeModule from "~/app/routes/reset-password.tsx";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("reset-password", () => {
	describe("loader", () => {
		test("passes a token from the callback to the form", async () => {
			const scope = await setupTestRequestScope();
			const route = testRoute(scope, routeModule, {});

			const result = await route.loader({ query: { token: "example" } });

			expect(result.data?.token).toBe("example");
		});

		test("rejects a callback error", async () => {
			const scope = await setupTestRequestScope();
			const route = testRoute(scope, routeModule, {});

			const result = await route.loader({ query: { token: "example", error: "INVALID_TOKEN" } });

			expect(result.data?.token).toBeNull();
		});
	});
});
