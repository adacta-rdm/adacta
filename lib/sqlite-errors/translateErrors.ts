/**
 * Makes a Drizzle SQLite connection throw UniqueConstraintViolationError when
 * a statement breaks a unique constraint. Each database driver reports such a
 * failure in its own form. The caller therefore passes a function that reads
 * the columns from the driver's error. Every other error passes unchanged.
 *
 * Drizzle runs every statement through the prepareQuery method of the
 * connection's session. This module replaces that method. The session is not
 * part of Drizzle's documented API. A Drizzle update may therefore change it.
 */
import { UniqueConstraintViolationError } from "~/lib/sqlite-errors/UniqueConstraintViolationError.ts";

/**
 * Returns the columns that a unique-constraint failure names, for example
 * ["Person.email"]. Returns undefined for any other error.
 */
export type ReportedColumns = (error: unknown) => string[] | undefined;

/**
 * The methods of a prepared statement that run it. A synchronous driver
 * returns the result or throws. An asynchronous driver returns a promise.
 */
const RUN_METHODS = ["run", "all", "get", "values"] as const;

type PreparedQuery = Record<(typeof RUN_METHODS)[number], (...args: unknown[]) => unknown>;

type Session = { prepareQuery(...args: unknown[]): PreparedQuery };

/**
 * Returns the connection after its statements translate their errors.
 */
export function translateErrors<Connection extends object>(
	connection: Connection,
	reportedColumns: ReportedColumns,
): Connection {
	const session = (connection as unknown as { session: Session }).session;
	const prepareQuery = session.prepareQuery.bind(session);

	session.prepareQuery = (...args) => {
		const prepared = prepareQuery(...args);

		for (const method of RUN_METHODS) {
			const run = prepared[method].bind(prepared);
			prepared[method] = (...runArgs) => translating(() => run(...runArgs), reportedColumns);
		}

		return prepared;
	};

	return connection;
}

/**
 * Returns the result of the call. A thrown or rejected error is translated.
 * A synchronous result stays synchronous. For example, a batch of a
 * synchronous driver reads the result inside a transaction.
 */
export function translating<Result>(call: () => Result, reportedColumns: ReportedColumns): Result {
	let result: Result;

	try {
		result = call();
	} catch (error) {
		throw translateError(error, reportedColumns);
	}

	if (result instanceof Promise) {
		return result.catch((error: unknown) => {
			throw translateError(error, reportedColumns);
		}) as Result;
	}

	return result;
}

/**
 * Returns UniqueConstraintViolationError for a unique-constraint failure, and
 * the error itself otherwise.
 */
function translateError(error: unknown, reportedColumns: ReportedColumns): unknown {
	const columns = reportedColumns(error);

	return columns === undefined
		? error
		: new UniqueConstraintViolationError(columns, { cause: error });
}
