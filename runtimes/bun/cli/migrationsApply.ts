import { Env } from "~/lib/env/Env.ts";
import { migrateSqliteDatabase, sqliteDatabasePath } from "~/runtimes/bun/sqliteDatabase.ts";

/**
 * Applies pending migrations to the SQLite database and keeps its records.
 */
export async function migrationsApply(): Promise<void> {
	migrateSqliteDatabase(sqliteDatabasePath(new Env()));

	console.log("Migrations applied.");
}
