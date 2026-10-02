/**
 * Application services use this database contract.
 * Each deployment provides one manager implementation.
 */
import type { AnyRelations } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { SQLiteAsyncDatabase } from "drizzle-orm/sqlite-core";

/**
 * The subset of Drizzle's SQLite database shared by the synchronous Bun driver
 * and an asynchronous remote driver. Callers must await query results, which
 * works for both result kinds. Writes that belong together use `batch`. A
 * manager replaces a driver's own batch method with one that returns
 * `BatchResult[]`.
 */
export type ApplicationDatabase = Omit<
	SQLiteAsyncDatabase<"sync" | "async", any, AnyRelations>,
	"transaction" | "batch"
> & {
	/**
	 * Runs the statements in order and returns the number of changed rows of
	 * each. If one statement fails, the database keeps none of the changes.
	 */
	batch(statements: BatchStatements): Promise<BatchResult[]>;
};

/**
 * A SQLite query builder that can run as one statement in a batch.
 */
export type BatchStatement = BatchItem<"sqlite"> & { run(): unknown };

/**
 * The ordered statements of one batch.
 */
export type BatchStatements = readonly BatchStatement[];

/**
 * The number of rows changed by one statement.
 */
export type BatchResult = { changes: number };

/**
 * ServiceContainer uses this class as the database-manager token.
 *
 * Every method may return a promise. A caller awaits the result even where the
 * implementation it holds returns nothing. For example,
 * `SqliteDatabaseManager.migrateSystem` migrates the database before it
 * returns, and its caller still awaits it.
 */
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
