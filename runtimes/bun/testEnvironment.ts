/**
 * The test environment of the Bun runtime. Each container keeps its SQLite
 * file and its stored files in a new temporary directory. A test therefore
 * never sees the rows or files of another test.
 */
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Env, type EnvSource } from "~/lib/env/Env.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";
import { createBunAppContainer } from "~/runtimes/bun/appContainer.ts";
import { migrateSqliteDatabase, sqliteDatabasePath } from "~/runtimes/bun/sqliteDatabase.ts";

export function createTestAppContainer(env: EnvSource = {}): ServiceContainer {
	// Only the directory is created here. The SQLite file is created when a
	// test first uses the database.
	const directory = mkdtempSync(join(tmpdir(), "adacta-test-"));

	return createBunAppContainer(
		new Env({
			ADACTA_LOG_LEVEL: "silent",
			ADACTA_DB_DIR: join(directory, "db"),
			ADACTA_STORAGE_DIR: join(directory, "storage"),
			...env,
		}),
	);
}

export async function migrateTestDatabase(container: ServiceContainer): Promise<void> {
	migrateSqliteDatabase(sqliteDatabasePath(container.get(Env)));
}

export async function storedFiles(scope: ServiceContainer): Promise<string[]> {
	const directory = scope.get(Env).string("ADACTA_STORAGE_DIR");
	if (!existsSync(directory)) return [];

	return readdirSync(directory, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name);
}
