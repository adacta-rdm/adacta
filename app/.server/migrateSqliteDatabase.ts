import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import { openSqliteDatabase } from "~/app/.server/sqliteDatabase.ts";

/**
 * Applies pending SQL migrations to the local file and closes the connection.
 * Repeating the operation preserves application records.
 */
export function migrateSqliteDatabase(path: string): void {
	const connection = openSqliteDatabase(path);

	try {
		migrate(connection, {
			migrationsFolder: new URL("../../drizzle/migrations", import.meta.url).pathname,
		});
	} finally {
		connection.$client.close();
	}
}
