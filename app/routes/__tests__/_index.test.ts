import { describe, expect, test } from "bun:test";

import { loader } from "~/app/routes/_index.tsx";
import { RepoManager } from "~/app/services/RepoManager.ts";
import { Security } from "~/app/services/Security.ts";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { setupTestUserEnvironment, signUpTestUser } from "~/app/testUtils/testUtils.ts";

describe("_index loader", () => {
	test("lists only the repositories the user may open", async () => {
		const container = await setupTestUserEnvironment();
		const manager = container.get(RepoManager);

		manager.createRepository("demo", "Demo Laboratory");
		manager.createRepository("pilot", "Pilot Plant");
		manager.grantAccess(container.get(Security).userId, "demo");

		const [args] = createMiddlewareArgs(container);

		expect(loader(args).repositories).toEqual([{ slug: "demo", name: "Demo Laboratory" }]);
	});

	test("shows nothing to a user without a grant", async () => {
		const container = await setupTestUserEnvironment();
		container.get(RepoManager).createRepository("demo");

		const [args] = createMiddlewareArgs(container);

		expect(loader(args).repositories).toEqual([]);
	});

	test("a grant held by another user does not appear", async () => {
		const container = await setupTestUserEnvironment();
		const manager = container.get(RepoManager);
		const other = await signUpTestUser(container, { email: "other@example.com" });

		manager.createRepository("demo");
		manager.grantAccess(other, "demo");

		const [args] = createMiddlewareArgs(container);

		expect(loader(args).repositories).toEqual([]);
	});

	test("orders the repositories by name", async () => {
		const container = await setupTestUserEnvironment();
		const manager = container.get(RepoManager);
		const { userId } = container.get(Security);

		for (const [slug, name] of [
			["pilot", "Pilot Plant"],
			["demo", "Demo Laboratory"],
		]) {
			manager.createRepository(slug, name);
			manager.grantAccess(userId, slug);
		}

		const [args] = createMiddlewareArgs(container);

		expect(loader(args).repositories.map((r) => r.name)).toEqual([
			"Demo Laboratory",
			"Pilot Plant",
		]);
	});
});
