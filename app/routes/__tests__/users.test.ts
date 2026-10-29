import { describe, expect, test } from "bun:test";

import * as usersRoute from "~/app/routes/users.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { BetterAuth } from "~/app/services/BetterAuth.ts";
import { EmailSender } from "~/app/services/EmailSender.ts";
import { Security } from "~/app/services/Security.ts";
import { UserAccess } from "~/app/services/UserAccess.ts";
import { CapturedEmailSender } from "~/app/testUtils/CapturedEmailSender.ts";
import { createTestUser } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope, TEST_USER } from "~/app/testUtils/testUtils.ts";
import { Verification } from "~/drizzle/schema/BetterAuth.ts";

// These requests carry no session cookie, as with ADACTA_DEV_USER.
async function makeAdmin(scope: Awaited<ReturnType<typeof setupTestRequestScope>>) {
	await scope.get(UserAccess).setRole(scope.get(Security).userId, "admin");
}

describe("users", () => {
	describe("loader", () => {
		test("lists registered and record-only users with their roles", async () => {
			const scope = await setupTestRequestScope();
			await makeAdmin(scope);
			const person = await createTestUser(scope);
			const route = testRoute(scope, usersRoute, {});

			const result = await route.loader();

			expect(result.data!.isAdmin).toBe(true);
			expect(result.data!.users).toEqual([
				{ ...person, canSignIn: false, role: "user", invitationExpiresAt: null },
				{
					id: scope.get(Security).userId,
					name: TEST_USER.name,
					email: TEST_USER.email,
					canSignIn: true,
					role: "admin",
					invitationExpiresAt: null,
				},
			]);
		});
	});

	describe("action", () => {
		test.each(["invite", "resend", "cancel", "role"])(
			"rejects non-admin %s requests",
			async (intent) => {
				const scope = await setupTestRequestScope();
				const route = testRoute(scope, usersRoute, {});

				const result = await route.action({
					intent,
					name: "Ada",
					email: "ada@example.com",
					userId: "target",
					role: "admin",
				});

				expect(result.status).toBe(403);
			},
		);

		test("creates a record-only user and redirects to the list", async () => {
			const scope = await setupTestRequestScope();
			const route = testRoute(scope, usersRoute, {});

			const result = await route.action({ name: "Ada Example", email: "ADA@example.com" });

			expect(result.status).toBe(303);
			expect(result.location).toBe("/users");
			expect((await route.loader()).data!.users).toContainEqual({
				id: expect.any(String),
				name: "Ada Example",
				email: "ada@example.com",
				canSignIn: false,
				role: "user",
				invitationExpiresAt: null,
			});
		});

		test.each(["create", "invite"])("reports invalid fields for %s", async (intent) => {
			const scope = await setupTestRequestScope();
			await makeAdmin(scope);
			const route = testRoute(scope, usersRoute, {});

			const result = await route.action({ intent, name: " ", email: "not-an-email" });

			expect(result.status).toBe(400);
			expect(result.data!.errors).toEqual({
				name: "A name is required.",
				email: "Enter a valid email address.",
			});
			expect((await route.loader()).data!.users).toHaveLength(1);
		});

		test("reports a missing email address", async () => {
			const scope = await setupTestRequestScope();
			const route = testRoute(scope, usersRoute, {});

			const result = await route.action({ name: "Ada", email: "" });

			expect(result.status).toBe(400);
			expect(result.data!.errors.email).toBe("An email address is required.");
		});

		test("reports an email address already used by another user", async () => {
			const scope = await setupTestRequestScope();
			const route = testRoute(scope, usersRoute, {});

			const result = await route.action({ name: "Another User", email: TEST_USER.email });

			expect(result.status).toBe(400);
			expect(result.data!.errors.email).toBe("This email address already belongs to a user.");
		});

		test("invites a new person without a session cookie", async () => {
			const scope = await setupTestRequestScope({ ADACTA_DEV_USER: TEST_USER.email });
			await makeAdmin(scope);
			const route = testRoute(scope, usersRoute, {});
			const mail = scope.get(EmailSender) as CapturedEmailSender;

			const result = await route.action({
				intent: "invite",
				name: "Ada",
				email: "ADA@example.com",
			});

			expect(result.status).toBe(200);
			expect(result.data!.message).toBe("Invitation sent.");
			expect(mail.messages).toHaveLength(1);
			expect(mail.messages[0].to).toBe("ada@example.com");
			const person = (await route.loader()).data!.users.find(
				(user) => user.email === "ada@example.com",
			)!;
			expect(person.canSignIn).toBe(false);
			expect(person.invitationExpiresAt!.getTime() - Date.now()).toBeGreaterThan(
				47 * 60 * 60 * 1000,
			);
		});

		test("preserves the identity and name of an existing person", async () => {
			const scope = await setupTestRequestScope();
			await makeAdmin(scope);
			const person = await createTestUser(scope);
			const route = testRoute(scope, usersRoute, {});

			const result = await route.action({
				intent: "invite",
				name: "Different name",
				email: person.email,
			});

			expect(result.status).toBe(200);
			expect(
				(await route.loader()).data!.users.filter((user) => user.email === person.email),
			).toEqual([
				{
					id: person.id,
					name: person.name,
					email: person.email,
					role: "user",
					canSignIn: false,
					invitationExpiresAt: expect.any(Date),
				},
			]);
		});

		test("resends an invitation and invalidates the earlier link", async () => {
			const scope = await setupTestRequestScope();
			await makeAdmin(scope);
			const person = await createTestUser(scope);
			const route = testRoute(scope, usersRoute, {});
			const mail = scope.get(EmailSender) as CapturedEmailSender;
			await route.action({ intent: "resend", userId: person.id });
			const first = mail.link().pathname.split("/").at(-1)!;

			const result = await route.action({ intent: "resend", userId: person.id });

			expect(result.status).toBe(200);
			expect(result.data!.message).toBe("Invitation sent.");
			expect(mail.link().pathname.split("/").at(-1)!).not.toBe(first);
			expect(
				(await route.loader()).data!.users.find((user) => user.id === person.id)!
					.invitationExpiresAt,
			).toBeInstanceOf(Date);
			await expect(
				scope
					.get(BetterAuth)
					.api.resetPassword({ body: { token: first, newPassword: "new-password" } }),
			).rejects.toThrow();
		});

		test("keeps one setup link after concurrent resends", async () => {
			const scope = await setupTestRequestScope();
			await makeAdmin(scope);
			const person = await createTestUser(scope);
			const route = testRoute(scope, usersRoute, {});
			const mail = scope.get(EmailSender) as CapturedEmailSender;

			const results = await Promise.all([
				route.action({ intent: "resend", userId: person.id }),
				route.action({ intent: "resend", userId: person.id }),
			]);

			expect(results.map((result) => result.status)).toEqual([200, 200]);
			expect(mail.messages).toHaveLength(2);
			const tokens = await scope.get(ApplicationDatabase).select().from(Verification);
			expect(tokens).toHaveLength(1);
			expect(
				mail.messages.map(
					(_, index) => `reset-password:${mail.link(index).pathname.split("/").at(-1)}`,
				),
			).toContain(tokens[0].identifier);
		});

		test("cancels an invitation and invalidates its link", async () => {
			const scope = await setupTestRequestScope();
			await makeAdmin(scope);
			const person = await createTestUser(scope);
			const route = testRoute(scope, usersRoute, {});
			const mail = scope.get(EmailSender) as CapturedEmailSender;
			await route.action({ intent: "resend", userId: person.id });
			const pending = mail.link().pathname.split("/").at(-1)!;

			const result = await route.action({ intent: "cancel", userId: person.id });

			expect(result.status).toBe(200);
			expect(result.data!.message).toBe("Invitation canceled.");
			expect(
				(await route.loader()).data!.users.find((user) => user.id === person.id)!
					.invitationExpiresAt,
			).toBeNull();
			await expect(
				scope
					.get(BetterAuth)
					.api.resetPassword({ body: { token: pending, newPassword: "new-password" } }),
			).rejects.toThrow();
		});

		test.each(["invite", "resend", "cancel"])(
			"rejects %s for a person who can already sign in",
			async (intent) => {
				const scope = await setupTestRequestScope();
				await makeAdmin(scope);
				const route = testRoute(scope, usersRoute, {});

				const result = await route.action({
					intent,
					name: TEST_USER.name,
					email: TEST_USER.email,
					userId: scope.get(Security).userId,
				});

				expect(result.status).toBe(400);
				expect(result.data!.errors.form).toContain("already has a sign-in account");
			},
		);

		test.each(["invite", "resend"])(
			"reports failed %s delivery and retains no setup link",
			async (intent) => {
				const scope = await setupTestRequestScope();
				await makeAdmin(scope);
				const person = await createTestUser(scope);
				const route = testRoute(scope, usersRoute, {});
				const mail = scope.get(EmailSender) as CapturedEmailSender;
				mail.fail = true;

				const result = await route.action({
					intent,
					name: person.name,
					email: person.email,
					userId: person.id,
				});

				expect(result.status).toBe(400);
				expect(result.data!.errors.form).toContain("Email could not be sent");
				expect(
					(await route.loader()).data!.users.find((user) => user.id === person.id)!
						.invitationExpiresAt,
				).toBeNull();
			},
		);

		test("reports a missing invitation recipient", async () => {
			const scope = await setupTestRequestScope();
			await makeAdmin(scope);
			const route = testRoute(scope, usersRoute, {});

			const result = await route.action({ intent: "resend", userId: "missing" });

			expect(result.status).toBe(400);
			expect(result.data!.errors.form).toBe("User was not found.");
		});

		test.each(["resend", "cancel", "role"])("rejects %s without a user ID", async (intent) => {
			const scope = await setupTestRequestScope();
			await makeAdmin(scope);
			const route = testRoute(scope, usersRoute, {});

			const result = await route.action({ intent, role: "admin" });

			expect(result.status).toBe(400);
		});

		test("reports a cancellation when no invitation exists", async () => {
			const scope = await setupTestRequestScope();
			await makeAdmin(scope);
			const person = await createTestUser(scope);
			const route = testRoute(scope, usersRoute, {});

			const result = await route.action({ intent: "cancel", userId: person.id });

			expect(result.status).toBe(400);
			expect(result.data!.errors.form).toBe("No invitation was found.");
		});

		test("changes a role and applies demotion to the next request", async () => {
			const scope = await setupTestRequestScope();
			await makeAdmin(scope);
			await createTestUser(scope, { canSignIn: true, role: "admin" });
			const route = testRoute(scope, usersRoute, {});

			const result = await route.action({
				intent: "role",
				userId: scope.get(Security).userId,
				role: "user",
			});

			expect(result.status).toBe(200);
			expect(result.data!.message).toBe("Role updated.");
			expect((await route.loader()).data!.isAdmin).toBe(false);
			expect(
				(await route.action({ intent: "invite", name: "Other", email: "other@example.com" }))
					.status,
			).toBe(403);
		});

		test.each([
			["user", "last administrator"],
			["owner", "Choose a valid role."],
		])("rejects invalid role change to %s", async (role, message) => {
			const scope = await setupTestRequestScope();
			await makeAdmin(scope);
			const route = testRoute(scope, usersRoute, {});

			const result = await route.action({
				intent: "role",
				userId: scope.get(Security).userId,
				role,
			});

			expect(result.status).toBe(400);
			expect(result.data!.errors.form).toContain(message);
			expect((await route.loader()).data!.isAdmin).toBe(true);
		});

		test("reports a missing user when changing a role", async () => {
			const scope = await setupTestRequestScope();
			await makeAdmin(scope);
			const route = testRoute(scope, usersRoute, {});

			const result = await route.action({ intent: "role", userId: "missing", role: "admin" });

			expect(result.status).toBe(400);
			expect(result.data!.errors.form).toContain("User was not found");
		});

		test("reports an unknown action", async () => {
			const scope = await setupTestRequestScope();
			await makeAdmin(scope);
			const route = testRoute(scope, usersRoute, {});

			const result = await route.action({ intent: "unknown" });

			expect(result.status).toBe(400);
			expect(result.data!.errors.form).toBe("Unknown action.");
		});
	});
});
