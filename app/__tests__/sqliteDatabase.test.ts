import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { setupTestPersistenceEnvironment } from "~/app/testUtils/testUtils.ts";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { Env } from "~/lib/env/Env.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";

/**
 * Converts a synchronous driver error into a promise rejection.
 */
async function settle<T>(query: () => Promise<T>): Promise<T> {
	return await query();
}

const environment = setupTestPersistenceEnvironment;
const BatchTest = sqliteTable("batch_test", {
	id: integer("id").primaryKey(),
	name: text("name").notNull().unique(),
});

function dbPath(container: ServiceContainer) {
	return join(container.get(Env).string("ADACTA_DB_DIR"), "adacta.sqlite");
}

describe("local SQLite connection", () => {
	describe("openSqliteDatabase", () => {
		test("writes the file into the configured directory", () => {
			const container = environment();

			container.get(ApplicationDatabase);

			expect(existsSync(dbPath(container))).toBe(true);
		});

		test("creates the directory when it does not exist", () => {
			const nested = join(environment().get(Env).string("ADACTA_DB_DIR"), "nested");
			const container = environment({ ADACTA_DB_DIR: nested });

			container.get(ApplicationDatabase);

			expect(existsSync(dbPath(container))).toBe(true);
		});

		test("enforces foreign keys", async () => {
			const db = environment().get(ApplicationDatabase);
			await db.run(sql`CREATE TABLE parent (id integer primary key)`);
			await db.run(sql`CREATE TABLE child (parent_id integer references parent(id))`);

			const insert = settle(() => db.run(sql`INSERT INTO child (parent_id) VALUES (1)`));

			await expect(insert).rejects.toThrow();
		});

		test("leaves migration explicit when opening", async () => {
			const db = environment().get(ApplicationDatabase);

			await expect(settle(() => db.select().from(InventoryEntry).all())).rejects.toThrow();
		});
	});

	describe("batch", () => {
		test("writes every statement and reports changes in order", async () => {
			const db = environment().get(ApplicationDatabase);
			await db.run(
				sql`CREATE TABLE batch_test (id integer primary key, name text not null unique)`,
			);

			const results = await db.batch([
				db.insert(BatchTest).values([
					{ id: 1, name: "first" },
					{ id: 2, name: "second" },
				]),
				db.delete(BatchTest).where(sql`${BatchTest.name} = 'first'`),
				db.insert(BatchTest).values({ id: 3, name: "third" }),
			]);

			expect(results).toEqual([{ changes: 2 }, { changes: 1 }, { changes: 1 }]);
			expect((await db.select().from(BatchTest).all()).map((row) => row.name)).toEqual([
				"second",
				"third",
			]);
		});

		test("rolls back earlier statements when a later statement fails", async () => {
			const db = environment().get(ApplicationDatabase);
			await db.run(
				sql`CREATE TABLE batch_test (id integer primary key, name text not null unique)`,
			);

			await expect(
				db.batch([
					db.insert(BatchTest).values({ id: 1, name: "same" }),
					db.insert(BatchTest).values({ id: 2, name: "same" }),
				]),
			).rejects.toThrow();
			expect(await db.select().from(BatchTest).all()).toEqual([]);
		});

		test("accepts an empty list", async () => {
			const db = environment().get(ApplicationDatabase);
			expect(await db.batch([])).toEqual([]);
		});
	});
});
