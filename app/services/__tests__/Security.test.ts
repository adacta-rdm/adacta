import { describe, expect, test } from "bun:test";

import { Security } from "~/app/services/Security";
import { setupTestEnvironment } from "~/app/testUtils/testUtils";

describe("Security", () => {
	test("holds the authenticated user", () => {
		const security = setupTestEnvironment().get(Security);
		security.setCurrentUserId("user-1");

		expect(security.userId).toBe("user-1");
	});

	test("throws when no user is established", () => {
		const security = setupTestEnvironment().get(Security);

		expect(() => security.userId).toThrow(/No current user is available/);
	});

	test("rejects a second user", () => {
		const security = setupTestEnvironment().get(Security);
		security.setCurrentUserId("user-1");

		expect(() => security.setCurrentUserId("user-2")).toThrow(/only be set once/);
	});

	test("each container scope is independent", () => {
		const first = setupTestEnvironment().get(Security);
		const second = setupTestEnvironment().get(Security);

		first.setCurrentUserId("user-1");

		expect(() => second.userId).toThrow();
	});
});
