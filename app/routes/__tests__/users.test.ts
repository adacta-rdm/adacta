import { describe, expect, test } from "bun:test";

import { eq } from "drizzle-orm";

import * as usersRoute from "~/app/routes/users.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { UserManager } from "~/app/services/UserManager.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";
import { Account } from "~/drizzle/schema/BetterAuth.ts";

describe("users", () => {
	describe("loader", () => {
		test("lists registered and record-only users", async () => {
			const scope = await setupTestRequestScope();
			const route = testRoute(scope, usersRoute, {});

			await scope
				.get(UserManager)
				.createRecordOnlyUser({ name: "Ada Example", email: "ADA@EXAMPLE.COM" });

			const result = await route.loader();

			expect(result.status).toBe(200);
			expect(result.data!.users).toEqual([
				{
					id: expect.any(String),
					name: "Ada Example",
					email: "ada@example.com",
					canSignIn: false,
				},
				{
					id: expect.any(String),
					name: "Test User",
					email: "test.user@example.com",
					canSignIn: true,
				},
			]);
		});
	});

	describe("action", () => {
		test("creates no sign-in account and redirects to the user list", async () => {
			const scope = await setupTestRequestScope();
			const route = testRoute(scope, usersRoute, {});

			const result = await route.action({ name: "Ada Example", email: "ada@example.com" });

			expect(result.status).toBe(303);
			expect(result.location).toBe("/users");

			const system = scope.get(ApplicationDatabase);
			const user = (await route.loader()).data!.users.find(
				(user) => user.email === "ada@example.com",
			);
			expect(user?.name).toBe("Ada Example");
			expect(await system.select().from(Account).where(eq(Account.userId, user!.id)).all()).toEqual(
				[],
			);
		});

		test("reports invalid fields without creating a user", async () => {
			const scope = await setupTestRequestScope();
			const route = testRoute(scope, usersRoute, {});

			const result = await route.action({ name: " ", email: "not-an-email" });

			expect(result.status).toBe(400);
			expect(result.data!.errors).toEqual({
				name: "A name is required.",
				email: "Enter a valid email address.",
			});
			expect((await route.loader()).data!.users).toHaveLength(1);
		});

		test("reports an email address already used by another user", async () => {
			const scope = await setupTestRequestScope();
			const route = testRoute(scope, usersRoute, {});

			const result = await route.action({
				name: "Another Test User",
				email: "test.user@example.com",
			});

			expect(result.status).toBe(400);
			expect(result.data!.errors.email).toBe("This email address already belongs to a user.");
		});
	});
});
