import { describe, expect, test } from "bun:test";

import { sessionAuth } from "~/app/middleware/authentication";
import { Security } from "~/app/services/Security";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs";
import {
	setupEmptyTestDatabaseEnvironment,
	TEST_USER,
	signInTestUser,
	signUpTestUser,
} from "~/app/testUtils/testUtils";

describe("sessionAuth", () => {
	test("redirects to the login page when there is no session", async () => {
		const container = setupEmptyTestDatabaseEnvironment();
		const [args] = createMiddlewareArgs(container);

		const thrown = await sessionAuth(args).then(
			() => undefined,
			(error: unknown) => error,
		);

		expect(thrown).toBeInstanceOf(Response);
		expect((thrown as Response).status).toBe(302);
		expect((thrown as Response).headers.get("location")).toBe("/login");
	});

	test("establishes the user from a session cookie", async () => {
		const container = setupEmptyTestDatabaseEnvironment();
		const userId = await signUpTestUser(container);
		const cookie = await signInTestUser(container);

		const [args] = createMiddlewareArgs(container, {
			request: new Request("http://localhost/", { headers: { cookie } }),
		});

		await sessionAuth(args);

		expect(container.get(Security).userId).toBe(userId);
	});

	test("signs in as ADACTA_DEV_USER outside production", async () => {
		const container = setupEmptyTestDatabaseEnvironment({ ADACTA_DEV_USER: TEST_USER.email });
		const userId = await signUpTestUser(container);

		const [args] = createMiddlewareArgs(container);
		await sessionAuth(args);

		expect(container.get(Security).userId).toBe(userId);
	});

	test("reports an ADACTA_DEV_USER that does not exist", async () => {
		const container = setupEmptyTestDatabaseEnvironment({ ADACTA_DEV_USER: "nobody@example.com" });
		const [args] = createMiddlewareArgs(container);

		expect(sessionAuth(args)).rejects.toThrow(/nobody@example.com/);
	});

	test("ignores ADACTA_DEV_USER in production", async () => {
		const container = setupEmptyTestDatabaseEnvironment({ ADACTA_DEV_USER: TEST_USER.email });
		await signUpTestUser(container);

		const [args] = createMiddlewareArgs(container);
		const previousNodeEnv = process.env.NODE_ENV;

		try {
			process.env.NODE_ENV = "production";
			const thrown = await sessionAuth(args).then(
				() => undefined,
				(error: unknown) => error,
			);

			expect(thrown).toBeInstanceOf(Response);
			expect((thrown as Response).headers.get("location")).toBe("/login");
		} finally {
			if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
			else process.env.NODE_ENV = previousNodeEnv;
		}
	});
});
