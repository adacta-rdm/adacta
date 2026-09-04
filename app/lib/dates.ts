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
