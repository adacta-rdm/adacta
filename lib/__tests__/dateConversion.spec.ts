import { describe, test, expect } from "vitest";

import { assertIsoDate, createDate, createMaybeDate } from "../createDate";

describe("Date conversion / format assertion from ISO string to Date and vive versa", () => {
	test.each([
		[new Date().toISOString(), true],
		["bogus", false],
		[new Date().toISOString().slice(0, -3), false],
	])("assertIsoDate", (isoString, valid) => {
		// Setting number of assertion calls here because expect is being called conditionally below.
		expect.assertions(1);

		if (valid) {
			expect(() => assertIsoDate(isoString)).not.toThrow();
		} else {
			expect(() => assertIsoDate(isoString)).toThrow();
		}
	});

	test("createDate / createMaybeDate", () => {
		const isoString = new Date().toISOString();
		expect(createDate(isoString)?.toISOString()).toEqual(isoString);
		expect(createMaybeDate(isoString)?.toISOString()).toEqual(isoString);
		expect(createMaybeDate(undefined)?.toISOString()).toBeUndefined();
		expect(createMaybeDate(null)?.toISOString()).toBeUndefined();
	});
});
