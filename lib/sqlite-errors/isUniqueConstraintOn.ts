/**
 * Recognizes the error SQLite raises when an insert or update breaks a unique
 * constraint. A caller can then let the database decide whether a value is
 * taken, instead of checking first. A check before the write cannot decide,
 * because another write can take the value in between.
 */
import { DrizzleQueryError } from "drizzle-orm";

/**
 * Whether the error is a unique-constraint failure on exactly these columns.
 * The columns are written as SQLite reports them, as table and column joined
 * by a period. For example, a constraint on the batch and the slug of a sample
 * is "Sample.sample_batch_id, Sample.slug". Any other error returns false.
 */
export function isUniqueConstraintOn(error: unknown, columns: string): boolean {
	// Drizzle wraps the SQLite error. SQLite identifies a unique constraint by
	// its columns in the message instead of reporting the index name.
	const databaseError = error instanceof DrizzleQueryError ? error.cause : error;

	return (
		databaseError instanceof Error &&
		"code" in databaseError &&
		databaseError.code === "SQLITE_CONSTRAINT_UNIQUE" &&
		databaseError.message === `UNIQUE constraint failed: ${columns}`
	);
}
