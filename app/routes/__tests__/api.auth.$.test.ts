import { describe, expect, test } from "bun:test";

import { eq } from "drizzle-orm";

import * as authRoute from "~/app/routes/api.auth.$.ts";
import * as usersRoute from "~/app/routes/users.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { EmailSender } from "~/app/services/EmailSender.ts";
import { Security } from "~/app/services/Security.ts";
import { UserAccess } from "~/app/services/UserAccess.ts";
import { CapturedEmailSender } from "~/app/testUtils/CapturedEmailSender.ts";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { createTestUser } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope, signInTestUser, TEST_USER } from "~/app/testUtils/testUtils.ts";
import { Session, User, Verification } from "~/drizzle/schema/BetterAuth.ts";

const origin = "http://localhost:5173";
const password = "new-invited-password";

type Scope = Awaited<ReturnType<typeof setupTestRequestScope>>;

async function requests(scope: Scope) {
	const cookie = await signInTestUser(scope);
	const mail = scope.get(EmailSender) as CapturedEmailSender;
	const users = testRoute(scope, usersRoute, {});

	async function post(path: string, body: unknown, authenticated = false) {
		const request = new Request(`${origin}/api/auth${path}`, {
			method: "POST",
			headers: { origin, "content-type": "application/json", ...(authenticated ? { cookie } : {}) },
			body: JSON.stringify(body),
		});
		const [args] = createMiddlewareArgs(scope, { request });

		return authRoute.action(args);
	}

	async function openRecoveryLink(index?: number) {
		const [args] = createMiddlewareArgs(scope, { request: new Request(mail.link(index)) });
		return authRoute.loader(args);
	}

	return { cookie, mail, users, post, openRecoveryLink };
}

async function invite(scope: Scope) {
	await scope.get(UserAccess).setRole(scope.get(Security).userId, "admin");
	const person = await createTestUser(scope);
	await testRoute(scope, usersRoute, {}).action({ intent: "resend", userId: person.id });

	return person;
}

describe("api.auth.$", () => {
	describe("loader", () => {
		test("validates an invitation before opening account setup", async () => {
			const scope = await setupTestRequestScope();
			const { mail, openRecoveryLink } = await requests(scope);
			await invite(scope);

			const result = await openRecoveryLink();

			expect(result.status).toBe(302);
			const redirect = new URL(result.headers.get("location")!);
			expect(redirect.origin + redirect.pathname).toBe(`${origin}/setup-account`);
			expect(redirect.searchParams.get("token")).toBe(mail.link().pathname.split("/").at(-1)!);
		});

		test("redirects a canceled invitation to the invalid state", async () => {
			const scope = await setupTestRequestScope();
			const { users, openRecoveryLink } = await requests(scope);
			const person = await invite(scope);
			await users.action({ intent: "cancel", userId: person.id });

			const result = await openRecoveryLink();

			expect(result.status).toBe(302);
			const redirect = new URL(result.headers.get("location")!);
			expect(redirect.pathname).toBe("/setup-account");
			expect(redirect.searchParams.get("error")).toBe("INVALID_TOKEN");
		});

		test("returns the signed-in identity", async () => {
			const scope = await setupTestRequestScope();
			const { cookie } = await requests(scope);
			const [args] = createMiddlewareArgs(scope, {
				request: new Request(`${origin}/api/auth/get-session`, { headers: { cookie } }),
			});

			const result = await authRoute.loader(args);

			expect(result.status).toBe(200);
			expect(((await result.json()) as { user: { id: string } }).user.id).toBe(
				scope.get(Security).userId,
			);
		});

		test.each(["expired", "used"])(
			"redirects an %s recovery link to the invalid state",
			async (state) => {
				const scope = await setupTestRequestScope();
				const { post, openRecoveryLink } = await requests(scope);
				await post("/request-password-reset", { email: TEST_USER.email });
				const db = scope.get(ApplicationDatabase);
				if (state === "expired") {
					await db.update(Verification).set({ expiresAt: new Date(Date.now() - 1000) });
				} else {
					await db.delete(Verification);
				}

				const result = await openRecoveryLink();

				expect(result.status).toBe(302);
				const redirect = new URL(result.headers.get("location")!);
				expect(redirect.origin + redirect.pathname).toBe(`${origin}/reset-password`);
				expect(redirect.searchParams.get("error")).toBe("INVALID_TOKEN");
			},
		);
	});

	describe("action", () => {
		test("activates the invited identity and verifies email ownership", async () => {
			const scope = await setupTestRequestScope();
			const { mail, users, post } = await requests(scope);
			const person = await invite(scope);
			const token = mail.link().pathname.split("/").at(-1)!;

			const result = await post("/reset-password", { token, newPassword: password });

			expect(result.status).toBe(200);
			expect(
				(await users.loader()).data!.users.find((user) => user.id === person.id),
			).toMatchObject({
				name: person.name,
				role: "user",
				canSignIn: true,
				invitationExpiresAt: null,
			});
			// Email verification has no separate page.
			const user = await scope
				.get(ApplicationDatabase)
				.select({ emailVerified: User.emailVerified })
				.from(User)
				.where(eq(User.id, person.id))
				.get();
			expect(user?.emailVerified).toBe(true);
			expect((await post("/sign-in/email", { email: person.email, password })).ok).toBe(true);
		});

		test("rejects a setup link after it has been used", async () => {
			const scope = await setupTestRequestScope();
			const { mail, post } = await requests(scope);
			await invite(scope);
			const token = mail.link().pathname.split("/").at(-1)!;
			await post("/reset-password", { token, newPassword: password });

			const result = await post("/reset-password", { token, newPassword: password });

			expect(result.status).toBe(400);
		});

		test("keeps the link valid after rejecting a short password", async () => {
			const scope = await setupTestRequestScope();
			const { mail, post } = await requests(scope);
			await invite(scope);
			const token = mail.link().pathname.split("/").at(-1)!;

			const result = await post("/reset-password", { token, newPassword: "short" });

			expect(result.status).toBe(400);
			expect((await post("/reset-password", { token, newPassword: password })).ok).toBe(true);
		});

		test("rejects an expired setup link", async () => {
			const scope = await setupTestRequestScope();
			const { mail, post } = await requests(scope);
			await invite(scope);
			const token = mail.link().pathname.split("/").at(-1)!;
			// Expiration cannot be set through a page.
			await scope
				.get(ApplicationDatabase)
				.update(Verification)
				.set({ expiresAt: new Date(Date.now() - 1000) })
				.where(eq(Verification.identifier, `reset-password:${token}`));

			const result = await post("/reset-password", { token, newPassword: password });

			expect(result.status).toBe(400);
		});

		test.each([false, true])(
			"recovery cannot activate record-only identities with authenticated=%s",
			async (authenticated) => {
				const scope = await setupTestRequestScope();
				const { mail, post } = await requests(scope);
				const person = await createTestUser(scope);
				const unknown = await post("/request-password-reset", { email: "unknown@example.com" });

				const result = await post(
					"/request-password-reset",
					{ email: person.email },
					authenticated,
				);

				expect(await result.json()).toEqual(await unknown.json());
				expect(mail.messages).toEqual([]);
				expect(await scope.get(ApplicationDatabase).select().from(Verification)).toEqual([]);
			},
		);

		test.each([false, true])(
			"recovery preserves a pending invitation with authenticated=%s",
			async (authenticated) => {
				const scope = await setupTestRequestScope();
				const { mail, post } = await requests(scope);
				const person = await invite(scope);
				const token = mail.link().pathname.split("/").at(-1)!;
				const unknown = await post("/request-password-reset", { email: "unknown@example.com" });

				const result = await post(
					"/request-password-reset",
					{ email: person.email.toUpperCase() },
					authenticated,
				);

				expect(await result.json()).toEqual(await unknown.json());
				expect(mail.messages).toHaveLength(1);
				expect((await post("/reset-password", { token, newPassword: password })).ok).toBe(true);
			},
		);

		test("conceals failed recovery delivery and removes the token", async () => {
			const scope = await setupTestRequestScope();
			const { mail, post } = await requests(scope);
			mail.fail = true;
			const unknown = await post("/request-password-reset", { email: "unknown@example.com" });

			const result = await post("/request-password-reset", { email: TEST_USER.email });

			expect(result.status).toBe(unknown.status);
			expect(await result.json()).toEqual(await unknown.json());
			expect(await scope.get(ApplicationDatabase).select().from(Verification)).toEqual([]);
		});

		test("sends a recovery link that expires in one hour", async () => {
			const scope = await setupTestRequestScope();
			const { mail, post, openRecoveryLink } = await requests(scope);

			const result = await post("/request-password-reset", { email: TEST_USER.email });

			expect(result.status).toBe(200);
			expect(mail.messages[0].subject).toBe("Reset your Adacta password");
			expect(mail.link().pathname).toMatch(/^\/api\/auth\/reset-password\//);
			const callback = await openRecoveryLink();
			expect(callback.status).toBe(302);
			const redirect = new URL(callback.headers.get("location")!);
			expect(redirect.origin + redirect.pathname).toBe(`${origin}/reset-password`);
			expect(redirect.searchParams.get("token")).toBeTruthy();
			const verification = await scope.get(ApplicationDatabase).select().from(Verification).get();
			expect(verification!.expiresAt.getTime() - Date.now()).toBeGreaterThan(59 * 60 * 1000);
			expect(verification!.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(60 * 60 * 1000);
		});

		test("changes the password and revokes existing sessions", async () => {
			const scope = await setupTestRequestScope();
			const { post, openRecoveryLink } = await requests(scope);
			await post("/request-password-reset", { email: TEST_USER.email });
			const token = new URL((await openRecoveryLink()).headers.get("location")!).searchParams.get(
				"token",
			)!;

			const result = await post("/reset-password", { token, newPassword: password });

			expect(result.status).toBe(200);
			expect(await scope.get(ApplicationDatabase).select().from(Session)).toEqual([]);
			expect(
				(await post("/sign-in/email", { email: TEST_USER.email, password: TEST_USER.password })).ok,
			).toBe(false);
			expect((await post("/sign-in/email", { email: TEST_USER.email, password })).ok).toBe(true);
		});

		test("invalidates other recovery links after a password reset", async () => {
			const scope = await setupTestRequestScope();
			const { post, openRecoveryLink } = await requests(scope);
			await post("/request-password-reset", { email: TEST_USER.email });
			const earlier = new URL((await openRecoveryLink()).headers.get("location")!).searchParams.get(
				"token",
			)!;
			await post("/request-password-reset", { email: TEST_USER.email });
			const later = new URL((await openRecoveryLink()).headers.get("location")!).searchParams.get(
				"token",
			)!;

			const result = await post("/reset-password", { token: later, newPassword: password });

			expect(result.status).toBe(200);
			expect(
				(await post("/reset-password", { token: earlier, newPassword: password })).status,
			).toBe(400);
		});

		test("rejects public sign-up", async () => {
			const scope = await setupTestRequestScope();
			const { users, post } = await requests(scope);

			const result = await post("/sign-up/email", {
				name: "Intruder",
				email: "intruder@example.com",
				password,
				role: "admin",
			});

			expect(result.ok).toBe(false);
			expect((await users.loader()).data!.users).toHaveLength(1);
		});

		test("ignores role changes submitted through profile updates", async () => {
			const scope = await setupTestRequestScope();
			const { users, post } = await requests(scope);

			await post("/update-user", { name: "Changed", role: "admin" }, true);

			expect((await users.loader()).data!.isAdmin).toBe(false);
		});
	});
});
