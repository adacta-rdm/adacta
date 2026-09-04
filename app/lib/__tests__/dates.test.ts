import { describe, expect, test } from "bun:test";

import { isCalendarDate } from "~/app/lib/dates";

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
