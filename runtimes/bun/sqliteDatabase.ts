import { Database as SQLite } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import type {
	ApplicationDatabase,
	BatchResult,
	BatchStatements,
} from "~/app/services/ApplicationDatabase.ts";
import { authRelations } from "~/drizzle/schema/BetterAuth.ts";
import type { Env } from "~/lib/env/Env.ts";
import { translateErrors } from "~/lib/sqlite-errors/translateErrors.ts";

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
	const connection = translateErrors(drizzle({ client, relations: authRelations }), constraintOf);

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
 * bun:sqlite starts the message of a unique-constraint failure with this text.
 * The columns follow, for example "Person.team, Person.nickname".
 */
const UNIQUE_FAILURE_PREFIX = "UNIQUE constraint failed: ";

/**
 * Returns the columns of a unique-constraint failure of bun:sqlite, or
 * "foreign-key" for a foreign key failure.
 * Returns undefined for any other error. Drizzle wraps the driver's error.
 * Hence, the error and each of its causes are searched.
 */
function constraintOf(error: unknown): string[] | "foreign-key" | undefined {
	for (let current = error; current instanceof Error; current = current.cause) {
		if ("code" in current && current.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
			return "foreign-key";
		}

		if (
			"code" in current &&
			(current.code === "SQLITE_CONSTRAINT_UNIQUE" ||
				current.code === "SQLITE_CONSTRAINT_PRIMARYKEY") &&
			current.message.startsWith(UNIQUE_FAILURE_PREFIX)
		) {
			return current.message.slice(UNIQUE_FAILURE_PREFIX.length).split(", ");
		}
	}

	return undefined;
}

/**
 * Applies pending SQL migrations to the local file and closes the connection.
 * Repeating the operation preserves application records.
 */
export function migrateSqliteDatabase(path: string): void {
	const connection = openSqliteDatabase(path);

	try {
		migrate(connection, {
			migrationsFolder: join(process.cwd(), "drizzle/migrations"),
		});
	} finally {
		connection.$client.close();
	}
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
