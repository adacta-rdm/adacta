/**
 * Makes a Drizzle SQLite connection throw typed errors when a statement breaks
 * a unique constraint or a foreign key. Each database driver reports such a
 * failure in its own form. The caller therefore passes a function that reads
 * the constraint from the driver's error. Every other error passes unchanged.
 *
 * Drizzle runs every statement through the prepareQuery method of the
 * connection's session. This module replaces that method. The session is not
 * part of Drizzle's documented API. A Drizzle update may therefore change it.
 */
import { ForeignKeyViolationError } from "~/lib/sqlite-errors/ForeignKeyViolationError.ts";
import { UniqueConstraintViolationError } from "~/lib/sqlite-errors/UniqueConstraintViolationError.ts";

/**
 * Reads which constraint a write broke from an error of the database driver.
 * The runtime supplies this function, because each driver reports a failure in
 * its own form. For example, the Bun runtime reads the code
 * SQLITE_CONSTRAINT_FOREIGNKEY.
 *
 * The function must return in the following form:
 * - an array of the columns to signify a unique-constraint failure, for example ["Person.email"],
 * - the string "foreign-key" for a foreign key,
 * - and `undefined` for any other error.
 */
export type ConstraintReader = (error: unknown) => string[] | "foreign-key" | undefined;

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
	readConstraint: ConstraintReader,
): Connection {
	const session = (connection as unknown as { session: Session }).session;
	const prepareQuery = session.prepareQuery.bind(session);

	session.prepareQuery = (...args) => {
		const prepared = prepareQuery(...args);

		for (const method of RUN_METHODS) {
			const run = prepared[method].bind(prepared);
			prepared[method] = (...runArgs) =>
				withTranslatedErrors(() => run(...runArgs), readConstraint);
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
export function withTranslatedErrors<Result>(
	call: () => Result,
	readConstraint: ConstraintReader,
): Result {
	let result: Result;

	try {
		result = call();
	} catch (error) {
		if (!(error instanceof Error)) throw error;
		throw translateError(error, readConstraint);
	}

	if (result instanceof Promise) {
		return result.catch((error: unknown) => {
			if (!(error instanceof Error)) throw error;
			throw translateError(error, readConstraint);
		}) as Result;
	}

	return result;
}

/**
 * Returns the typed error for a unique-constraint or foreign key failure.
 * Returns the error itself otherwise.
 */
export function translateError(error: Error, readConstraint: ConstraintReader) {
	const constraint = readConstraint(error);

	if (constraint === undefined) {
		return error;
	}

	if (constraint === "foreign-key") {
		return new ForeignKeyViolationError({ cause: error });
	}

	return new UniqueConstraintViolationError(constraint, { cause: error });
}
