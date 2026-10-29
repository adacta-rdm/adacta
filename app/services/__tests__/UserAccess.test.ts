import { describe, expect, test } from "bun:test";

import * as usersRoute from "~/app/routes/users.tsx";
import { Security } from "~/app/services/Security.ts";
import { UserAccess } from "~/app/services/UserAccess.ts";
import { createTestUser } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("UserAccess", () => {
	describe("setRole", () => {
		test("concurrent demotions preserve the last administrator", async () => {
			const scope = await setupTestRequestScope();
			const access = scope.get(UserAccess);
			const currentId = scope.get(Security).userId;
			await access.setRole(currentId, "admin");
			const second = await createTestUser(scope, { canSignIn: true, role: "admin" });
			const route = testRoute(scope, usersRoute, {});

			const results = await Promise.allSettled([
				access.setRole(currentId, "user"),
				access.setRole(second.id, "user"),
			]);

			expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
			expect(
				(await route.loader()).data!.users.filter((user) => user.role === "admin"),
			).toHaveLength(1);
		});
	});
});
