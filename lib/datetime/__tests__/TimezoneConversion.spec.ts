import { describe, test, expect } from "vitest";

import { localDateToTimezoneDate, timezoneDateToLocalDate } from "../TimezoneConversion";

describe("TimezoneConversion", () => {
	test("localDateToTimezoneDate", () => {
		// Create date in local timezone (for every non UTC timezone this should have a unix
		// timestamp non equal to 0
		const date = new Date(1970, 0, 1, 0, 0);

		// After reinterpretation into UTC the unix timestamp should be 0
		expect(localDateToTimezoneDate(date, "UTC").getTime()).toBe(0);
		expect(localDateToTimezoneDate(date, "America/Los_Angeles").getTime()).toBe(8 * 60 * 60 * 1000);
	});

	test("timezoneDateToLocalDate", () => {
		// Unix timestamp 8 * 60 * 60 * 1000 should become Thu Jan 01 1970 00:00:00 if interpreted
		// as America/Los Angeles
		expect(
			timezoneDateToLocalDate(new Date(8 * 60 * 60 * 1000), "America/Los_Angeles")
				.toString()
				.slice(0, 24)
		).toBe("Thu Jan 01 1970 00:00:00");
	});
});
