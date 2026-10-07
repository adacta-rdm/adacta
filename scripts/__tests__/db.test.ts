import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { sql } from "drizzle-orm";

import { migrateSqliteDatabase } from "~/app/.server/migrateSqliteDatabase.ts";
import { sqliteDatabasePath } from "~/app/.server/sqliteDatabase.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { setupTestPersistenceEnvironment } from "~/app/testUtils/testUtils.ts";
import { User } from "~/drizzle/schema/BetterAuth.ts";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { Env } from "~/lib/env/Env.ts";

const script = new URL("../db.ts", import.meta.url).pathname;
const project = new URL("../../", import.meta.url).pathname;

describe("db command", () => {
	test.each([
		{ args: ["setup", "missing-preset"] },
		{ args: ["reset", "pilot"] },
		{ args: ["migrate", "pilot"] },
		{ args: ["refresh", "pilot"] },
		{ args: ["setup", "demo", "pilot"] },
	])("preserves the database for invalid arguments %p", async ({ args }) => {
		const scope = setupTestPersistenceEnvironment();
		const env = scope.get(Env);
		const db = scope.get(ApplicationDatabase);
		await db.run(sql`CREATE TABLE preserved (value text)`);
		const path = join(env.string("ADACTA_DB_DIR"), "adacta.sqlite");
		const before = readFileSync(path);

		const result = Bun.spawnSync({
			cmd: [process.execPath, script, ...args],
			cwd: project,
			env: { ...process.env, ...env.values, NODE_ENV: "test" },
			stdout: "pipe",
			stderr: "pipe",
		});

		expect(result.exitCode).toBe(1);
		expect(readFileSync(path)).toEqual(before);
		if (args[1] === "missing-preset") {
			expect(result.stderr.toString()).toContain('Unknown preset "missing-preset"');
			expect(result.stderr.toString()).toContain("Available presets: demo, feature-test, pilot");
		} else {
			expect(result.stderr.toString()).toMatch(/preset name/);
		}
	});

	describe("reset", () => {
		test.each([true, false])(
			"creates a fresh migrated database when a file exists: %p",
			async (exists) => {
				const scope = setupTestPersistenceEnvironment();
				const env = scope.get(Env);
				const path = sqliteDatabasePath(env);
				if (exists) {
					migrateSqliteDatabase(path);
					const db = scope.get(ApplicationDatabase);
					await db.run(sql`CREATE TABLE preserved (value text)`);
					await db.run(sql`INSERT INTO preserved VALUES ('saved')`);
				}

				const result = Bun.spawnSync({
					cmd: [process.execPath, script, "reset"],
					cwd: project,
					env: { ...process.env, ...env.values, NODE_ENV: "test" },
					stdout: "pipe",
					stderr: "pipe",
				});

				expect(result.exitCode, result.stderr.toString()).toBe(0);
				// A fresh container opens the file produced by the command.
				const db = setupTestPersistenceEnvironment(env.values).get(ApplicationDatabase);
				expect(await db.select().from(User).all()).toEqual([]);
				expect(await db.select().from(InventoryEntry).all()).toEqual([]);
				expect(await db.all(sql`SELECT name FROM sqlite_master WHERE name = 'preserved'`)).toEqual(
					[],
				);
			},
		);
	});
});
