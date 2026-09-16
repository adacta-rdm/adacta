import { describe, expect, test } from "bun:test";

import { eq } from "drizzle-orm";

import { action, loader } from "~/app/routes/$repo.users.tsx";
import { SystemDB } from "~/app/services/SystemDB.ts";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { setupTestRepositoryEnvironment } from "~/app/testUtils/testUtils.ts";
import { Account, User } from "~/drizzle/schema/system.BetterAuth.ts";

function post(fields: Record<string, string>): Request {
	const form = new FormData();
	for (const [name, value] of Object.entries(fields)) form.set(name, value);

	return new Request("http://localhost/demo/users", { method: "POST", body: form });
}

describe("users route", () => {
	test("lists registered and record-only users", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const [actionArgs] = createMiddlewareArgs(scope, {
			request: post({ name: "Ada Example", email: "ADA@EXAMPLE.COM" }),
			params: { repo: "demo" },
		});

		const response = await action(actionArgs);
		expect(response).toBeInstanceOf(Response);

		const [loaderArgs] = createMiddlewareArgs(scope, { params: { repo: "demo" } });
		expect((await loader(loaderArgs)).users).toEqual([
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

	test("creates no sign-in account and redirects to the user list", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const [args] = createMiddlewareArgs(scope, {
			request: post({ name: "Ada Example", email: "ada@example.com" }),
			params: { repo: "demo" },
		});

		const response = await action(args);
		if (!(response instanceof Response)) throw new Error("Expected a redirect.");

		expect(response.status).toBe(303);
		expect(response.headers.get("Location")).toBe("/demo/users");

		const system = scope.get(SystemDB);
		const user = await system.select().from(User).where(eq(User.email, "ada@example.com")).get();
		expect(user?.name).toBe("Ada Example");
		expect(await system.select().from(Account).where(eq(Account.userId, user!.id)).all()).toEqual(
			[],
		);
	});

	test("reports invalid fields without creating a user", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const [args] = createMiddlewareArgs(scope, {
			request: post({ name: " ", email: "not-an-email" }),
			params: { repo: "demo" },
		});

		const response = await action(args);
		if (response instanceof Response) throw new Error("Expected action data.");

		expect(response.init?.status).toBe(400);
		expect(response.data.errors).toEqual({
			name: "A name is required.",
			email: "Enter a valid email address.",
		});
		expect(await scope.get(SystemDB).select().from(User).all()).toHaveLength(1);
	});

	test("reports an email address already used by another user", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const [args] = createMiddlewareArgs(scope, {
			request: post({ name: "Another Test User", email: "test.user@example.com" }),
			params: { repo: "demo" },
		});

		const response = await action(args);
		if (response instanceof Response) throw new Error("Expected action data.");

		expect(response.init?.status).toBe(400);
		expect(response.data.errors.email).toBe("This email address already belongs to a user.");
	});
});
