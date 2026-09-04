import { describe, expect, test } from "bun:test";

import { compareSampleNames, nextSampleName } from "~/app/lib/sampleNames";

describe("nextSampleName", () => {
	test("starts at one and continues after the highest number", () => {
		expect(nextSampleName([])).toBe("#01");
		expect(nextSampleName(["#01", "#03"])).toBe("#04");
	});

	test("ignores labels outside the numbering convention", () => {
		expect(nextSampleName(["control", "AX-7"])).toBe("#01");
	});
});

describe("compareSampleNames", () => {
	test("orders numbered labels by value before other labels", () => {
		expect(["control", "#10", "#02", "#01"].sort(compareSampleNames)).toEqual([
			"#01",
			"#02",
			"#10",
			"control",
		]);
	});
});
