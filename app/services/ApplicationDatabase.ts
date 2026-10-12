/**
 * Application services use this database contract.
 * Each deployment provides one connection.
 */
import type { AnyRelations } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { SQLiteAsyncDatabase } from "drizzle-orm/sqlite-core";

import { service } from "~/lib/service-container/ServiceContainer.ts";

/**
 * Every query result is typed as a promise. Callers therefore await it.
 * Writes that belong together use `batch`. Each deployment provides a batch
 * method that returns `BatchResult[]`.
 *
 * The result of `run()` has the form of the database driver. Its type is
 * therefore unknown. A caller that needs the number of changed rows runs the
 * statement as a batch, even when it is a single statement.
 *
 * A write that breaks a unique constraint rejects with
 * UniqueConstraintViolationError from lib/sqlite-errors, whatever form the
 * database driver reports it in. Every other error is the driver's own.
 */
export type ApplicationDatabase = Omit<
	SQLiteAsyncDatabase<"async", unknown, AnyRelations>,
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
 * Every application service uses this database token.
 * Each deployment provides it with one connection.
 */
export const ApplicationDatabase = service()(function ApplicationDatabase(): ApplicationDatabase {
	throw new Error("The deployment must provide the application database.");
});
