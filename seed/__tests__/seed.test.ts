import { beforeAll, describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";

import { RepoAccess } from "~/app/services/RepoAccess";
import { RepoManager } from "~/app/services/RepoManager";
import { Security } from "~/app/services/Security";
import { SystemDB } from "~/app/services/SystemDB";
import { setupTestPersistenceEnvironment } from "~/app/testUtils/testUtils";
import { User } from "~/drizzle/schema/system.BetterAuth";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer";
import { seedDatabase } from "~/seed/seed";

let container: ServiceContainer;

beforeAll(async () => {
	container = setupTestPersistenceEnvironment();

	await seedDatabase(container);
});

/**
 * Every user in the system database, by name. This reads the table directly.
 * Reading through RepoAccess would need a repository, which is what these
 * tests are checking.
 */
function registeredUsers(): string[] {
	return container
		.get(SystemDB)
		.select({ id: User.id, name: User.name })
		.from(User)
		.all()
		.map((user) => user.name)
		.sort();
}

/**
 * The names of the users who may open `slug`. Binding a repository needs an
 * authenticated user, so the scope borrows the one given.
 */
async function usersOf(slug: string, userId: string): Promise<string[]> {
	const scope = container.clone();

	scope.get(Security).setCurrentUserId(userId);
	scope.get(RepoAccess).selectRepository(slug);

	return (await scope.get(RepoAccess).users()).map((user) => user.name).sort();
}

function anyUserId(): string {
	return container.get(SystemDB).select({ id: User.id }).from(User).all()[0].id;
}

describe("seedDatabase", () => {
	test("registers one user for each file in seed/users", () => {
		const files = readdirSync("seed/users").filter((file) => file.endsWith(".json"));

		expect(registeredUsers()).toHaveLength(files.length);
	});

	test("finds the existing users when seeded again", async () => {
		const before = registeredUsers();

		await seedDatabase(container);

		expect(registeredUsers()).toEqual(before);
	});

	test("lets every user open every repository", async () => {
		const everyone = registeredUsers();
		const slugs = container.get(RepoManager).repositories();

		expect(slugs.length).toBeGreaterThan(0);

		for (const slug of slugs) {
			expect(await usersOf(slug, anyUserId())).toEqual(everyone);
		}
	});
});
