import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { DatabaseManager, InvalidDatabaseNameError } from "~/app/services/DatabaseManager";
import {
	RepoManager,
	RepositoryAlreadyExistsError,
	RepositoryNotFoundError,
} from "~/app/services/RepoManager";
import { SystemDB } from "~/app/services/SystemDB";
import { setupEmptyTestDatabaseEnvironment, signUpTestUser } from "~/app/testUtils/testUtils";
import { InventoryEntry } from "~/drizzle/schema/repo.InventoryEntry";
import { UserRepository } from "~/drizzle/schema/system.UserRepository";
import { Env } from "~/lib/utils/Env";

/**
 * A container with a migrated system database and nothing in it.
 */
const environment = setupEmptyTestDatabaseEnvironment;

describe("RepoManager", () => {
	test("migrateAll is safe to repeat", () => {
		const container = environment();
		container.get(RepoManager).createRepository("demo");

		expect(() => container.get(RepoManager).migrateAll()).not.toThrow();
	});

	test("creates a repository and lists it", () => {
		const manager = environment().get(RepoManager);
		manager.createRepository("demo", "Demo Laboratory");

		expect(manager.repositories()).toEqual(["demo"]);
	});

	test("creates the repository database", () => {
		const container = environment();
		container.get(RepoManager).createRepository("demo");

		const dbDir = container.get(Env).string("ADACTA_DB_DIR");
		expect(existsSync(join(dbDir, "demo.sqlite"))).toBe(true);
	});

	test("migrates the new repository database", () => {
		const container = environment();
		container.get(RepoManager).createRepository("demo");

		// The table only exists if the repo migrations ran.
		const repoDb = container.get(DatabaseManager).repoDb("demo");
		expect(() => repoDb.select().from(InventoryEntry).all()).not.toThrow();
	});

	test("rejects a duplicate repository", () => {
		const manager = environment().get(RepoManager);
		manager.createRepository("demo");

		expect(() => manager.createRepository("demo")).toThrow(RepositoryAlreadyExistsError);
	});

	test.each([["../escape"], ["with space"], ["semi;colon"], [""], ["a/b"]])(
		"rejects unsafe repository name %p",
		(slug) => {
			const manager = environment().get(RepoManager);

			expect(() => manager.createRepository(slug)).toThrow(InvalidDatabaseNameError);
		},
	);

	test("records nothing when the name is rejected", () => {
		const container = environment();

		expect(() => container.get(RepoManager).createRepository("../escape")).toThrow();
		expect(container.get(RepoManager).repositories()).toEqual([]);
	});

	test("grants access", async () => {
		const container = environment();
		const manager = container.get(RepoManager);
		const userId = await signUpTestUser(container);
		manager.createRepository("demo");

		manager.grantAccess(userId, "demo");

		expect(container.get(SystemDB).select().from(UserRepository).all()).toHaveLength(1);
	});

	test("granting twice is not an error", async () => {
		const container = environment();
		const manager = container.get(RepoManager);
		const userId = await signUpTestUser(container);
		manager.createRepository("demo");

		manager.grantAccess(userId, "demo");
		manager.grantAccess(userId, "demo");

		expect(container.get(SystemDB).select().from(UserRepository).all()).toHaveLength(1);
	});

	test("rejects a grant for a repository that does not exist", async () => {
		const container = environment();
		const userId = await signUpTestUser(container);

		expect(() => container.get(RepoManager).grantAccess(userId, "nope")).toThrow(
			RepositoryNotFoundError,
		);
	});

	test("lists nothing before anything is created", () => {
		expect(environment().get(RepoManager).repositories()).toEqual([]);
	});
});
