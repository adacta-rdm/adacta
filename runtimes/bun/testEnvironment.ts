/**
 * The test environment of the Bun runtime. Each container keeps its SQLite
 * file and its stored files in a new temporary directory. A test therefore
 * never sees the rows or files of another test.
 */
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { EmailSender } from "~/app/services/EmailSender.ts";
import { CapturedEmailSender } from "~/app/testUtils/CapturedEmailSender.ts";
import { Env, type EnvSource } from "~/lib/env/Env.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";
import { createBunAppContainer } from "~/runtimes/bun/appContainer.ts";
import { migrateSqliteDatabase, sqliteDatabasePath } from "~/runtimes/bun/sqliteDatabase.ts";

export function createTestAppContainer(env: EnvSource = {}): ServiceContainer {
	// Only the directory is created here. The SQLite file is created when a
	// test first uses the database.
	const directory = mkdtempSync(join(tmpdir(), "adacta-test-"));

	const container = createBunAppContainer(
		new Env({
			ADACTA_LOG_LEVEL: "silent",
			ADACTA_DB_DIR: join(directory, "db"),
			ADACTA_STORAGE_DIR: join(directory, "storage"),
			...env,
		}),
	);
	container.configure(EmailSender, () => new CapturedEmailSender());
	return container;
}

export async function migrateTestDatabase(container: ServiceContainer): Promise<void> {
	migrateSqliteDatabase(sqliteDatabasePath(container.get(Env)));
}

// Each container has its own directory. Its storage is therefore emptied by
// deleting that directory.
export async function emptyTestStorage(container: ServiceContainer): Promise<void> {
	rmSync(container.get(Env).string("ADACTA_STORAGE_DIR")!, { recursive: true, force: true });
}

export async function storedFiles(scope: ServiceContainer): Promise<string[]> {
	const directory = scope.get(Env).string("ADACTA_STORAGE_DIR");
	if (!existsSync(directory)) return [];

	return readdirSync(directory, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name);
}
