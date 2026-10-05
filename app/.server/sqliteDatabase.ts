import { Database as SQLite } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { drizzle } from "drizzle-orm/bun-sqlite";

import type {
	ApplicationDatabase,
	BatchResult,
	BatchStatements,
} from "~/app/services/ApplicationDatabase.ts";
import { authRelations } from "~/drizzle/schema/BetterAuth.ts";
import type { Env } from "~/lib/env/Env.ts";

/**
 * Returns the local database path from ADACTA_DB_DIR.
 */
export function sqliteDatabasePath(env: Env): string {
	return join(env.string("ADACTA_DB_DIR", ".adacta/db"), "adacta.sqlite");
}

/**
 * Opens the local database with foreign keys and atomic batches.
 * The application keeps its connection for the life of the process.
 * A migration closes its connection when it finishes.
 */
export function openSqliteDatabase(path: string) {
	mkdirSync(dirname(path), { recursive: true });
	const client = new SQLite(path);

	// SQLite checks foreign keys only when the connection asks for it.
	// Hence, every connection turns the check on. A migration that rebuilds
	// a table uses PRAGMA defer_foreign_keys, because PRAGMA foreign_keys
	// has no effect inside a transaction.
	client.run("PRAGMA foreign_keys = ON");
	const connection = drizzle({ client, relations: authRelations });

	return Object.assign(connection, {
		async batch(statements: BatchStatements): Promise<BatchResult[]> {
			if (statements.length === 0) return [];

			return connection.transaction(() =>
				statements.map((statement) => {
					const result = statement.run() as { changes: number };
					return { changes: result.changes };
				}),
			);
		},
	});
}

/**
 * Presents the local synchronous driver through the application contract.
 */
export function applicationDatabase(
	connection: ReturnType<typeof openSqliteDatabase>,
): ApplicationDatabase {
	// The Bun driver returns each result at once. Await accepts such a value.
	// However, calling then, catch, or finally on a result throws.
	return connection as unknown as ApplicationDatabase;
}
