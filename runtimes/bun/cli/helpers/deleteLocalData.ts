import { rmSync } from "node:fs";

import type { Env } from "~/lib/env/Env.ts";
import { sqliteDatabasePath } from "~/runtimes/bun/sqliteDatabase.ts";

/**
 * Deletes the SQLite database and the stored files of the environment. Rows
 * and files therefore always start empty together. The result is the same
 * whether the data was present or absent.
 */
export function deleteLocalData(env: Env): void {
	rmSync(sqliteDatabasePath(env), { force: true });
	rmSync(env.path("ADACTA_STORAGE_DIR", ".adacta/storage"), { recursive: true, force: true });

	console.log("Local database and stored files deleted.");
}
