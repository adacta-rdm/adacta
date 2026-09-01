import { describe, expect, test } from "bun:test";

import { BetterAuth } from "~/app/services/BetterAuth";
import { setupEmptyTestDatabaseEnvironment } from "~/app/testUtils/testUtils";
import { MissingEnvError } from "~/lib/env/Env";

/**
 * Run `body` as if the process were in production. NODE_ENV is process-wide, so
 * the previous value is restored even when the body throws.
 */
function inProduction<T>(body: () => T): T {
	const previous = process.env.NODE_ENV;

	try {
		process.env.NODE_ENV = "production";
		return body();
	} finally {
		if (previous === undefined) delete process.env.NODE_ENV;
		else process.env.NODE_ENV = previous;
	}
}

describe("BetterAuth", () => {
	test("takes the base URL from ADACTA_URL", () => {
		const container = setupEmptyTestDatabaseEnvironment({ ADACTA_URL: "https://adacta.example" });

		expect(container.get(BetterAuth).options.baseURL).toBe("https://adacta.example/");
	});

	test("falls back to the development server address", () => {
		const container = setupEmptyTestDatabaseEnvironment();

		expect(container.get(BetterAuth).options.baseURL).toBe("http://localhost:5173/");
	});

	test("reports a base URL that is not a URL", () => {
		const container = setupEmptyTestDatabaseEnvironment({ ADACTA_URL: "not a url" });

		expect(() => container.get(BetterAuth)).toThrow(/ADACTA_URL/);
	});

	test("uses a development secret outside production", () => {
		const container = setupEmptyTestDatabaseEnvironment();

		expect(container.get(BetterAuth).options.secret).toBeString();
	});

	test("takes the secret from ADACTA_AUTH_SECRET", () => {
		const secret = "a-secret-that-is-long-enough-for-better-auth";
		const container = setupEmptyTestDatabaseEnvironment({ ADACTA_AUTH_SECRET: secret });

		expect(container.get(BetterAuth).options.secret).toBe(secret);
	});

	test("requires the secret in production", () => {
		const container = setupEmptyTestDatabaseEnvironment();

		// Better Auth signs cookies with the secret. A shared default would let
		// anyone forge a session.
		inProduction(() => {
			expect(() => container.get(BetterAuth)).toThrow(MissingEnvError);
		});
	});
});
