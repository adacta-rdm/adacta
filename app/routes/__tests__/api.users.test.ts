import { describe, expect, test } from "bun:test";

import * as usersRoute from "~/app/routes/api.users.ts";
import { Security } from "~/app/services/Security.ts";
import { UserManager } from "~/app/services/UserManager.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope, signUpTestUser } from "~/app/testUtils/testUtils.ts";

describe("api.users", () => {
	describe("loader", () => {
		test("returns every user's ID and name, ordered by name and then ID", async () => {
			const scope = await setupTestRequestScope();
			const access = scope.get(UserManager);
			const zoeId = await signUpTestUser(scope, { name: "Zoe", email: "zoe@example.com" });
			const ada = await access.createRecordOnlyUser({ name: "Ada", email: "ada@example.com" });
			const otherAda = await access.createRecordOnlyUser({
				name: "Ada",
				email: "other-ada@example.com",
			});
			const route = testRoute(scope, usersRoute, {});

			const result = await route.loader();

			expect(result.status).toBe(200);
			expect(result.data).toEqual({
				users: [
					...[ada, otherAda]
						.map(({ id, name }) => ({ id, name }))
						.sort((left, right) => left.id.localeCompare(right.id)),
					{ id: scope.get(Security).userId, name: "Test User" },
					{ id: zoeId, name: "Zoe" },
				],
			});
		});
	});
});
