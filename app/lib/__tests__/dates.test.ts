import { describe, expect, test } from "bun:test";

import { formatCalendarDate, formatTimestamp, isCalendarDate } from "~/app/lib/dates.ts";

describe("isCalendarDate", () => {
	test("accepts a date written as year-month-day", () => {
		expect(isCalendarDate("2025-01-15")).toBe(true);
	});

	test("rejects a day the month does not have", () => {
		// 2025 is not a leap year. February therefore ends on the 28th.
		expect(isCalendarDate("2025-02-30")).toBe(false);
		expect(isCalendarDate("2025-02-29")).toBe(false);
		expect(isCalendarDate("2024-02-29")).toBe(true);
	});

	test("rejects another writing of the same day", () => {
		expect(isCalendarDate("15.01.2025")).toBe(false);
		expect(isCalendarDate("2025-1-15")).toBe(false);
	});

	test("rejects a date with a time", () => {
		expect(isCalendarDate("2025-01-15T10:00:00Z")).toBe(false);
	});

	test("rejects empty text", () => {
		expect(isCalendarDate("")).toBe(false);
		expect(isCalendarDate("   ")).toBe(false);
	});
});

describe("formatCalendarDate", () => {
	test("writes the day the text names", () => {
		expect(formatCalendarDate("2025-01-15")).toBe("Jan 15, 2025");
	});

	test("writes the same day in every time zone", () => {
		// A calendar date names one day everywhere. Read as a local time, an
		// early-morning date would fall back to the previous day west of UTC.
		expect(formatCalendarDate("2024-05-17")).toBe("May 17, 2024");
		expect(formatCalendarDate("2024-01-01")).toBe("Jan 1, 2024");
	});
});

describe("formatTimestamp", () => {
	test("writes the day the moment falls on", () => {
		expect(formatTimestamp(new Date("2025-01-15T12:00:00.000Z"))).toBe("Jan 15, 2025");
	});
});
