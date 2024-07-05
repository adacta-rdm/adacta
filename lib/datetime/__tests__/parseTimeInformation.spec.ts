import { describe, test, expect } from "vitest";

import type { IColumnTimeConfig } from "../../interface/IImportWizardPreset";
import { parseTimeInformation } from "../parseTimeInformation";

describe("parseTimeInformation", () => {
	const dateTimeInGermany = 946778645000; // 2000-01-02 03:04:05 (timezone: Europe/Berlin) in ms

	test("Column type 'datetime'", () => {
		const testString = "2000-01-02 03:04:05";
		const config: IColumnTimeConfig = {
			columnId: "x",
			title: "x",
			type: "datetime",
			format: "YYYY-MM-DD HH:mm:ss",
			timezone: "Europe/Berlin",
			normalizerIds: [],
		};

		const unixTimeGermany = parseTimeInformation(testString, config, ".");
		expect(unixTimeGermany).toBe(dateTimeInGermany);
	});

	test("Column type 'datetime' in 12-hour format", () => {
		const testString = "2000-01-02 03:04:05 PM";
		const config: IColumnTimeConfig = {
			columnId: "x",
			title: "x",
			type: "datetime",
			format: "YYYY-MM-DD hh:mm:ss A",
			timezone: "Europe/Berlin",
			normalizerIds: [],
		};

		const twelveHoursInMs = 12 * 60 * 60 * 1000;
		const unixTimeGermany = parseTimeInformation(testString, config, ".");

		// Shift hour by 12h since we changed from 03:04:05 to 15:04:05 (or 03:04:05 pm)
		expect(unixTimeGermany).toBe(dateTimeInGermany + twelveHoursInMs);
	});

	test("Column type 'offset'", () => {
		const offset = 3 * 60 * 60 + 4 * 60 + 5;
		const testString = String(offset); // 03:04:05
		const config: IColumnTimeConfig = {
			columnId: "date",
			title: "date",
			type: "offset",
			conversionFactor: 1e3,
			startDate: dateTimeInGermany - offset * 1000,
			timezone: "Europe/Berlin",
			normalizerIds: [],
		};

		const unixTimeGermany = parseTimeInformation(testString, config, ".");
		expect(unixTimeGermany).toBe(dateTimeInGermany);
	});

	// Test for various units  (ms, s, m, h) for the offset
	// The algorithm treats all offsets the same, but there was a bug where milliseconds were
	// ignored, resulting in an unnecessary loss of precision.
	test.each([1, 1000, 1000 * 60, 1000 * 60 * 60])("Date + Time offset", (conversion) => {
		// To test the offset mode we subtract 1234 from our timestamp and then read the offset 1234
		// (with the same conversion factor)
		const config: IColumnTimeConfig = {
			columnId: "t",
			title: "t",
			type: "offset",
			conversionFactor: conversion,
			startDate: dateTimeInGermany - 1234 * conversion,
			timezone: "Europe/Berlin",
			normalizerIds: [],
		};

		const testOffset = "1234";

		const unixTimeGermany = parseTimeInformation(testOffset, config, ".");
		expect(unixTimeGermany).toBe(dateTimeInGermany);
	});
});
