import { describe, expect, test } from "bun:test";

import { repositoryAccess } from "~/app/middleware/repositoryAccess.ts";
import { RepoAccess } from "~/app/services/RepoAccess.ts";
import { RepoManager } from "~/app/services/RepoManager.ts";
import { Security } from "~/app/services/Security.ts";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { setupTestUserEnvironment } from "~/app/testUtils/testUtils.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";

/**
 * A signed-in scope. This is the state sessionAuth leaves behind. Repositories
 * are created through RepoManager. A grant here is therefore the same row the
 * middleware checks.
 */
async function environment(granted: string[] = [], ungranted: string[] = []) {
	const container = await setupTestUserEnvironment();
	const manager = container.get(RepoManager);

	for (const slug of [...granted, ...ungranted]) {
		manager.createRepository(slug);
	}

	for (const slug of granted) {
		manager.grantAccess(container.get(Security).userId, slug);
	}

	return container;
}

function run(container: ServiceContainer, params: Record<string, string>) {
	const [args] = createMiddlewareArgs(container, { params });

	return repositoryAccess(args);
}

function caught(fn: () => void): unknown {
	try {
		fn();
		return undefined;
	} catch (error) {
		return error;
	}
}

describe("repositoryAccess", () => {
	test("binds the repository named in the route", async () => {
		const container = await environment(["demo"]);

		run(container, { repo: "demo" });

		expect(container.get(RepoAccess).repository).toBe("demo");
	});

	test("answers 404 when the route has no repository", async () => {
		const container = await environment();

		const thrown = caught(() => run(container, {}));

		expect(thrown).toBeInstanceOf(Response);
		expect((thrown as Response).status).toBe(404);
	});

	test("answers 403 when the user holds no grant", async () => {
		const container = await environment([], ["demo"]);

		const thrown = caught(() => run(container, { repo: "demo" }));

		expect(thrown).toBeInstanceOf(Response);
		expect((thrown as Response).status).toBe(403);
	});

	test("answers 403 for a repository that does not exist", async () => {
		const container = await environment();

		const thrown = caught(() => run(container, { repo: "nonsense" }));

		expect((thrown as Response).status).toBe(403);
	});

	test("leaves the scope unbound when access is denied", async () => {
		const container = await environment([], ["demo"]);

		caught(() => run(container, { repo: "demo" }));

		expect(() => container.get(RepoAccess).repository).toThrow(/No repository is available/);
	});

	test("does not turn an unrelated failure into a 403", async () => {
		const container = await environment(["demo", "pilot"]);
		run(container, { repo: "demo" });

		// Binding twice is a programming error, not a permission problem.
		const thrown = caught(() => run(container, { repo: "pilot" }));

		expect(thrown).not.toBeInstanceOf(Response);
		expect((thrown as Error).message).toMatch(/only be set once/);
	});
});
