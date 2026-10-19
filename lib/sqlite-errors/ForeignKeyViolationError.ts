/**
 * A write broke a foreign key. SQLite does not report which foreign key failed.
 * The error of the database driver is kept as the cause.
 */
export class ForeignKeyViolationError extends Error {
	constructor(options: { cause: unknown }) {
		super("FOREIGN KEY constraint failed", options);
		this.name = "ForeignKeyViolationError";
	}
}
