import { getColumnTable, getTableName } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

/**
 * A write broke a unique constraint, including a primary key. The columns name
 * the constraint in the form SQLite reports them, for example "Person.team"
 * and "Person.nickname". The error of the database driver is kept as the
 * cause.
 */
export class UniqueConstraintViolationError extends Error {
	constructor(
		public readonly columns: readonly string[],
		options: { cause: unknown },
	) {
		super(`UNIQUE constraint failed: ${columns.join(", ")}`, options);
		this.name = "UniqueConstraintViolationError";
	}

	/**
	 * Returns whether the constraint includes every given column. A column is
	 * compared by its table and its SQL name, in any order. With no columns,
	 * every constraint matches.
	 *
	 * For example, a table Person has a unique constraint on team and
	 * nickname. `isOn([Person.nickname])` then matches a failure of this
	 * constraint. The given columns must therefore identify one constraint. A
	 * second constraint on team and email would also match `[Person.team]`.
	 */
	isOn(columns: readonly SQLiteColumn[] = []): boolean {
		return columns.every((column) =>
			this.columns.includes(`${getTableName(getColumnTable(column))}.${column.name}`),
		);
	}
}
