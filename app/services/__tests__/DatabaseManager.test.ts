import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { sql } from "drizzle-orm";

import { DatabaseManager, InvalidDatabaseNameError } from "~/app/services/DatabaseManager";
import { setupTestDatabaseEnvironment } from "~/app/testUtils/testUtils";
import { InventoryEntry } from "~/drizzle/schema/repo.InventoryEntry";
import { Repository } from "~/drizzle/schema/system.Repository";
import type { ServiceContainer } from "~/lib/serviceContainer/ServiceContainer";
import { Env } from "~/lib/utils/Env";

/**
 * A container whose databases live in a fresh temporary directory.
 */
const environment = setupTestDatabaseEnvironment;

function dbDir(container: ServiceContainer) {
	return container.get(Env).string("ADACTA_DB_DIR");
}

describe("DatabaseManager", () => {
	describe("connections", () => {
		test("hands out a usable database handle", () => {
			const db = environment().get(DatabaseManager).system();

			db.run(sql`CREATE TABLE t (id integer primary key, name text)`);
			db.run(sql`INSERT INTO t (name) VALUES ('ada')`);

			expect(db.all(sql`SELECT name FROM t`)).toEqual([{ name: "ada" }]);
		});

		test("returns the same handle for the same database", () => {
			const databases = environment().get(DatabaseManager);
			const first = databases.repoDb("demo");

			expect(first).toBeDefined();
			expect(databases.repoDb("demo")).toBe(first);
		});

		test("keeps databases separate", () => {
			const databases = environment().get(DatabaseManager);

			databases.repoDb("demo").run(sql`CREATE TABLE t (id integer primary key)`);

			// The table exists in demo only. Pilot must therefore not see it.
			expect(() => databases.repoDb("pilot").all(sql`SELECT * FROM t`)).toThrow();
		});

		test("the system database is not one of the repositories", () => {
			const databases = environment().get(DatabaseManager);

			expect(databases.system()).not.toBe(databases.repoDb("demo"));
		});

		test("writes files into the configured directory", () => {
			const container = environment();
			container.get(DatabaseManager).repoDb("demo");

			expect(existsSync(join(dbDir(container), "demo.sqlite"))).toBe(true);
		});

		test("creates the directory when it does not exist", () => {
			const nested = join(dbDir(environment()), "does", "not", "exist");

			environment({ ADACTA_DB_DIR: nested }).get(DatabaseManager).system();

			expect(existsSync(join(nested, "_system.sqlite"))).toBe(true);
		});

		test("enforces foreign keys", () => {
			const db = environment().get(DatabaseManager).repoDb("demo");

			db.run(sql`CREATE TABLE parent (id integer primary key)`);
			db.run(sql`CREATE TABLE child (parent_id integer references parent(id))`);

			// No parent row with id 1 exists. The child row must therefore be rejected.
			expect(() => db.run(sql`INSERT INTO child (parent_id) VALUES (1)`)).toThrow();
		});

		test("is a singleton within one container", () => {
			const container = environment();

			expect(container.get(DatabaseManager)).toBe(container.get(DatabaseManager));
		});

		test("separate containers do not share databases", () => {
			const first = environment();
			const second = environment();

			expect(dbDir(first)).not.toBe(dbDir(second));
			expect(first.get(DatabaseManager)).not.toBe(second.get(DatabaseManager));
		});
	});

	describe("name validation", () => {
		test.each([["../escape"], ["a/b"], ["with space"], ["semi;colon"], [""], ["_system"]])(
			"rejects %p",
			(slug) => {
				const databases = environment().get(DatabaseManager);

				expect(() => databases.repoDb(slug)).toThrow(InvalidDatabaseNameError);
			},
		);

		test("creates no file for a rejected name", () => {
			const container = environment();

			expect(() => container.get(DatabaseManager).repoDb("../escape")).toThrow();
			expect(existsSync(join(dbDir(container), "..", "escape.sqlite"))).toBe(false);
		});

		test("accepts letters, digits, dashes and underscores", () => {
			const databases = environment().get(DatabaseManager);

			expect(() => databases.repoDb("demo-1_A")).not.toThrow();
		});
	});

	describe("dropping", () => {
		test("removes the repository file", () => {
			const container = environment();
			const databases = container.get(DatabaseManager);
			databases.migrateRepository("demo");

			databases.dropRepository("demo");

			expect(existsSync(join(dbDir(container), "demo.sqlite"))).toBe(false);
		});

		test("removes the system file", () => {
			const container = environment();
			const databases = container.get(DatabaseManager);
			databases.migrateSystem();

			databases.dropSystem();

			expect(existsSync(join(dbDir(container), "_system.sqlite"))).toBe(false);
		});

		test("a dropped repository comes back as a usable empty database", () => {
			const databases = environment().get(DatabaseManager);
			databases.migrateRepository("demo");

			databases.dropRepository("demo");

			// A closed handle would throw here. Opening again has to build a new
			// database. That database starts without the migrated tables.
			const db = databases.repoDb("demo");
			db.run(sql`CREATE TABLE t (id integer primary key)`);

			expect(db.all(sql`SELECT * FROM t`)).toEqual([]);
			expect(() => db.select().from(InventoryEntry).all()).toThrow();
		});

		test("leaves other databases alone", () => {
			const databases = environment().get(DatabaseManager);
			databases.migrateRepository("demo");
			databases.migrateRepository("pilot");

			databases.dropRepository("demo");

			expect(() => databases.repoDb("pilot").select().from(InventoryEntry).all()).not.toThrow();
		});

		test("dropping a repository that does not exist is not an error", () => {
			const databases = environment().get(DatabaseManager);

			expect(() => databases.dropRepository("never-created")).not.toThrow();
		});

		test.each([["../escape"], ["a/b"], ["_system"]])("rejects unsafe name %p", (slug) => {
			const databases = environment().get(DatabaseManager);

			expect(() => databases.dropRepository(slug)).toThrow(InvalidDatabaseNameError);
		});

		test("dropAll empties the directory", () => {
			const container = environment();
			const databases = container.get(DatabaseManager);
			databases.migrateSystem();
			databases.migrateRepository("demo");
			databases.migrateRepository("pilot");

			databases.dropAll();

			expect(readdirSync(dbDir(container))).toEqual([]);
		});

		test("dropAll removes a file no repository record knows about", () => {
			const container = environment();
			const databases = container.get(DatabaseManager);
			writeFileSync(join(dbDir(container), "orphan.sqlite"), "");

			databases.dropAll();

			expect(existsSync(join(dbDir(container), "orphan.sqlite"))).toBe(false);
		});

		test("deletes nothing when the name is rejected", () => {
			const container = environment();
			const databases = container.get(DatabaseManager);
			databases.migrateSystem();

			expect(() => databases.dropRepository("_system")).toThrow();
			expect(existsSync(join(dbDir(container), "_system.sqlite"))).toBe(true);
		});
	});

	describe("migrations", () => {
		test("migrateSystem creates the system tables", () => {
			const container = environment();
			container.get(DatabaseManager).migrateSystem();

			expect(() =>
				container.get(DatabaseManager).system().select().from(Repository).all(),
			).not.toThrow();
		});

		test("migrateRepository creates the repository tables", () => {
			const databases = environment().get(DatabaseManager);
			databases.migrateRepository("demo");

			expect(() => databases.repoDb("demo").select().from(InventoryEntry).all()).not.toThrow();
		});

		test("migrating twice is safe", () => {
			const databases = environment().get(DatabaseManager);
			databases.migrateSystem();
			databases.migrateRepository("demo");

			expect(() => {
				databases.migrateSystem();
				databases.migrateRepository("demo");
			}).not.toThrow();
		});

		test("does not migrate on open", () => {
			const databases = environment().get(DatabaseManager);

			// Opening must stay cheap: the repository database is bound per request.
			expect(() => databases.repoDb("demo").select().from(InventoryEntry).all()).toThrow();
		});

		test("rejects an unsafe name before migrating", () => {
			const container = environment();

			expect(() => container.get(DatabaseManager).migrateRepository("../escape")).toThrow(
				InvalidDatabaseNameError,
			);
		});
	});
});
