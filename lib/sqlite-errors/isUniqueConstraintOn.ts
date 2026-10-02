/**
 * Recognizes SQLite errors raised when an insert or update breaks a unique
 * constraint, including a primary key. Callers can therefore let the database
 * decide whether a value is already taken. Another write can take the value
 * between a check and an insert.
 */
import { DrizzleQueryError, getColumnTable, getTableName } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

/**
 * SQLite starts the message of a unique-constraint failure with this text. The
 * columns follow, for example "Person.team, Person.nickname".
 */
const MESSAGE_PREFIX = "UNIQUE constraint failed: ";

/**
 * Returns whether the error is a unique-constraint failure that names every
 * given column. A column is compared by its table and its SQL name. The
 * columns may be given in any order. With no columns, every unique-constraint
 * failure matches, including a duplicate primary key.
 *
 * For example, a table Person has a unique constraint on its columns team and
 * nickname. `isUniqueConstraintOn(error, [Person.nickname])` then matches a
 * failure of this constraint.
 *
 * The given columns must identify one constraint. For example, a second
 * unique constraint on team and email also includes team. Hence,
 * `[Person.team]` would match a failure of either constraint.
 */
export function isUniqueConstraintOn(
	error: unknown,
	columns: readonly SQLiteColumn[] = [],
): boolean {
	// Drizzle wraps the SQLite error. SQLite names the constraint's columns in
	// the message.
	const databaseError = error instanceof DrizzleQueryError ? error.cause : error;

	if (
		!(databaseError instanceof Error) ||
		!("code" in databaseError) ||
		(databaseError.code !== "SQLITE_CONSTRAINT_UNIQUE" &&
			databaseError.code !== "SQLITE_CONSTRAINT_PRIMARYKEY") ||
		!databaseError.message.startsWith(MESSAGE_PREFIX)
	) {
		return false;
	}

	const reportedColumns = databaseError.message.slice(MESSAGE_PREFIX.length).split(", ");

	return columns.every((column) =>
		reportedColumns.includes(`${getTableName(getColumnTable(column))}.${column.name}`),
	);
}
