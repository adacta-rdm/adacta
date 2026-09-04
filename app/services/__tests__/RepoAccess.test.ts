import { beforeAll, describe, expect, test } from "bun:test";

import { RepoAccess, RepositoryAccessDeniedError } from "~/app/services/RepoAccess";
import { RepoManager } from "~/app/services/RepoManager";
import { Security } from "~/app/services/Security";
import { setupTestUserEnvironment, signUpTestUser } from "~/app/testUtils/testUtils";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer";

/**
 * One environment for the whole file. Signing a user up runs a real password
 * hash. That is too slow to repeat for every test. The repositories below are
 * fixed data. They are therefore created once as well.
 *
 * Each test then works on its own scope, the way a request does.
 */
let app: ServiceContainer;
let userId: string;
let secondUserId: string;

beforeAll(async () => {
	app = await setupTestUserEnvironment();
	userId = app.get(Security).userId;

	const manager = app.get(RepoManager);

	for (const slug of ["demo", "pilot", "ungranted", "foreign"]) {
		manager.createRepository(slug);
	}

	manager.grantAccess(userId, "demo");
	manager.grantAccess(userId, "pilot");

	// A second user of "demo". The user list then has more than one entry to order.
	secondUserId = await signUpTestUser(app, {
		name: "Zoe Researcher",
		email: "zoe.researcher@example.com",
	});
	manager.grantAccess(secondUserId, "demo");

	const otherUser = await signUpTestUser(app, { email: "other@example.com" });
	manager.grantAccess(otherUser, "foreign");
});

/**
 * A fresh scope with the same user and repositories, but nothing bound yet.
 *
 * RepoAccess is never resolved on `app`. Each clone therefore builds its own.
 */
function scope(): ServiceContainer {
	return app.clone();
}

describe("RepoAccess", () => {
	test("binds a repository the user may access", () => {
		const access = scope().get(RepoAccess);
		access.selectRepository("demo");

		expect(access.repository).toBe("demo");
	});

	test("rejects a repository the user holds no grant for", () => {
		const access = scope().get(RepoAccess);

		expect(() => access.selectRepository("ungranted")).toThrow(RepositoryAccessDeniedError);
	});

	test("leaves the scope unbound when access is denied", () => {
		const access = scope().get(RepoAccess);

		expect(() => access.selectRepository("ungranted")).toThrow();
		expect(() => access.repository).toThrow(/No repository is available/);
	});

	test("rejects a repository that does not exist", () => {
		const access = scope().get(RepoAccess);

		expect(() => access.selectRepository("nonsense")).toThrow(RepositoryAccessDeniedError);
	});

	test("a grant for one repository does not open another", () => {
		const access = scope().get(RepoAccess);
		access.selectRepository("demo");

		expect(() => scope().get(RepoAccess).selectRepository("ungranted")).toThrow(
			RepositoryAccessDeniedError,
		);
	});

	test("a grant held by another user does not apply", () => {
		const access = scope().get(RepoAccess);

		expect(() => access.selectRepository("foreign")).toThrow(RepositoryAccessDeniedError);
	});

	test("the error names the user and the repository", () => {
		const access = scope().get(RepoAccess);

		expect(() => access.selectRepository("ungranted")).toThrow(
			new RegExp(`"${userId}".*"ungranted"`),
		);
	});

	test("throws when nothing is bound yet", () => {
		const access = scope().get(RepoAccess);

		expect(() => access.repository).toThrow(/No repository is available/);
	});

	test("rejects a second selection", () => {
		const access = scope().get(RepoAccess);
		access.selectRepository("demo");

		expect(() => access.selectRepository("pilot")).toThrow(/only be set once/);
	});

	test("names both repositories when rejecting a second selection", () => {
		const access = scope().get(RepoAccess);
		access.selectRepository("demo");

		expect(() => access.selectRepository("pilot")).toThrow(/"demo".*"pilot"/);
	});

	test("each scope binds independently", () => {
		const first = scope();
		first.get(RepoAccess).selectRepository("demo");

		expect(() => scope().get(RepoAccess).repository).toThrow(/No repository is available/);
	});

	describe("users", () => {
		test("lists the users who may open the bound repository", async () => {
			const access = scope().get(RepoAccess);
			access.selectRepository("demo");

			expect(await access.users()).toEqual([
				{ id: userId, name: "Test User" },
				{ id: secondUserId, name: "Zoe Researcher" },
			]);
		});

		test("leaves out a user who holds no grant for it", async () => {
			const access = scope().get(RepoAccess);
			access.selectRepository("pilot");

			expect((await access.users()).map((user) => user.id)).toEqual([userId]);
		});

		test("throws when no repository is bound", async () => {
			const error = await scope()
				.get(RepoAccess)
				.users()
				.catch((error: unknown) => error);

			expect(error).toBeInstanceOf(Error);
			if (!(error instanceof Error)) return;
			expect(error.message).toMatch(/No repository is available/);
		});
	});
});
