/**
 * Application services use this database contract.
 * Each deployment provides one manager implementation.
 *
 * A local manager can return a query result immediately.
 * A remote manager can return a promise.
 * Application services await either result.
 */
import type { AnyRelations } from "drizzle-orm";
import type { SQLiteAsyncDatabase } from "drizzle-orm/sqlite-core";

/**
 * The subset of Drizzle's SQLite database shared by the synchronous Bun and
 * asynchronous D1 drivers. Callers must await query results, which works for
 * both result kinds.
 */
export type ApplicationDatabase = SQLiteAsyncDatabase<"sync" | "async", any, AnyRelations>;

/** ServiceContainer uses this class as the database-manager token. */
export abstract class DatabaseManager {
	abstract system(): ApplicationDatabase;

	abstract repoDb(slug: string): ApplicationDatabase;

	abstract migrateSystem(): void | Promise<void>;

	abstract migrateRepository(slug: string): void | Promise<void>;

	abstract dropSystem(): void | Promise<void>;

	abstract dropRepository(slug: string): void | Promise<void>;

	abstract dropAll(): void | Promise<void>;
}

export class InvalidDatabaseNameError extends Error {
	constructor(public readonly databaseName: string) {
		super(`Invalid database name "${databaseName}".`);
		this.name = "InvalidDatabaseNameError";
	}
}
