/**
 * A calendar date is one day, written as year-month-day. For example
 * "2025-01-15". It carries no time and no time zone. It therefore names the
 * same day everywhere it is read.
 */

/**
 * Whether the text is a calendar date that exists.
 *
 * For example, "2025-02-30" is rejected. February 2025 ends on the 28th. A
 * date written in another form is rejected as well. "15.01.2025" is therefore
 * not a calendar date here.
 */
export function isCalendarDate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

	// A day the month does not have rolls over. "2025-02-30" becomes March 2.
	// The comparison with the input catches this.
	const parsed = new Date(`${value}T00:00:00.000Z`);

	return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * A calendar date written for a reader, as "Jan 15, 2025".
 *
 * The text is read as UTC, because a calendar date names one day everywhere.
 * Read as a local time instead, "2025-01-15" would fall back to January 14
 * for a reader west of UTC.
 */
export function formatCalendarDate(value: string): string {
	return CALENDAR_DATE_FORMAT.format(new Date(`${value}T00:00:00.000Z`));
}

/**
 * A moment in time written for a reader, as "Jan 15, 2025".
 *
 * The day is the one the moment falls on where the text is written. A record
 * created just before midnight is therefore dated differently in Karlsruhe
 * and in Chicago.
 */
export function formatTimestamp(value: Date): string {
	return TIMESTAMP_FORMAT.format(value);
}

// The formatters are built once. Building one is expensive, and these are
// called for every row of a table.
const CALENDAR_DATE_FORMAT = new Intl.DateTimeFormat("en", {
	dateStyle: "medium",
	timeZone: "UTC",
});

const TIMESTAMP_FORMAT = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
