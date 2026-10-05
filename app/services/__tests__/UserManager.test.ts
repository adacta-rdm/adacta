import { describe, expect, test } from "bun:test";

import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import { UserManager, UserEmailAlreadyExistsError } from "~/app/services/UserManager.ts";
import { setupTestUserEnvironment, signUpTestUser } from "~/app/testUtils/testUtils.ts";
import { Account, User } from "~/drizzle/schema/BetterAuth.ts";

// Route tests also cover these results. These service tests cover the shared user directory.
describe("UserManager", () => {
	describe("users", () => {
		test("lists every registered and record-only user in name order", async () => {
			const scope = await setupTestUserEnvironment();
			const currentId = scope.get(Security).userId;
			const secondId = await signUpTestUser(scope, {
				name: "Zoe Researcher",
				email: "zoe@example.com",
			});
			const access = scope.get(UserManager);
			const recordOnly = await access.createRecordOnlyUser({
				name: "Ada Example",
				email: "ada@example.com",
			});

			const users = await access.users();

			expect(users).toEqual([
				{ id: recordOnly.id, name: "Ada Example" },
				{ id: currentId, name: "Test User" },
				{ id: secondId, name: "Zoe Researcher" },
			]);
		});
	});

	describe("usersWithSignIn", () => {
		test("reports whether every user has a sign-in account", async () => {
			const scope = await setupTestUserEnvironment();
			const access = scope.get(UserManager);
			const recordOnly = await access.createRecordOnlyUser({
				name: "Ada Example",
				email: "ada@example.com",
			});

			const users = await access.usersWithSignIn();

			expect(users).toEqual([
				{ ...recordOnly, canSignIn: false },
				{
					id: scope.get(Security).userId,
					name: "Test User",
					email: "test.user@example.com",
					canSignIn: true,
				},
			]);
		});
	});

	describe("createRecordOnlyUser", () => {
		test("creates one identity without a sign-in account", async () => {
			const scope = await setupTestUserEnvironment();
			const access = scope.get(UserManager);

			const created = await access.createRecordOnlyUser({
				name: "Ada Example",
				email: "ada@example.com",
			});

			expect(await scope.get(ApplicationDatabase).select().from(User).all()).toHaveLength(2);
			expect(await scope.get(ApplicationDatabase).select().from(Account).all()).toHaveLength(1);
			expect((await access.users()).map((user) => user.id)).toContain(created.id);
		});

		test.each(["test.user@example.com", "Test.User@Example.com"])(
			"rejects the existing email %s",
			async (email) => {
				const scope = await setupTestUserEnvironment();
				const access = scope.get(UserManager);

				await expect(
					access.createRecordOnlyUser({ name: "Another Test User", email }),
				).rejects.toThrow(UserEmailAlreadyExistsError);

				expect(await scope.get(ApplicationDatabase).select().from(User).all()).toHaveLength(1);
			},
		);

		test("stores the email address in lower case", async () => {
			const scope = await setupTestUserEnvironment();
			const access = scope.get(UserManager);

			const created = await access.createRecordOnlyUser({
				name: "Ada Example",
				email: "Ada@Example.com",
			});

			expect(created.email).toBe("ada@example.com");
		});
	});
});
