import { describe, test, expect } from "vitest";

import { compositeHeaderAutomatic } from "../CompositeHeaderAutomatic";

describe("Automatic header composition", () => {
	test("3-level-test", () => {
		const header = [
			["category1", "", "", "", "category2", "", "", ""],
			["subcategory1", "", "subcategory2", "", "subcategory3", "", "subcategory4", ""],
			["a", "b", "a", "b", "a", "b", "a", "b"],
		];
		expect(compositeHeaderAutomatic(header)).toEqual([
			["category1", "subcategory1", "a"],
			["category1", "subcategory1", "b"],
			["category1", "subcategory2", "a"],
			["category1", "subcategory2", "b"],
			["category2", "subcategory3", "a"],
			["category2", "subcategory3", "b"],
			["category2", "subcategory4", "a"],
			["category2", "subcategory4", "b"],
		]);
	});

	test("Leading column with single-header-line", () => {
		const header = [
			["", "category1", "", "category2", ""],
			["Time", "a", "b", "a", "b"],
		];
		expect(compositeHeaderAutomatic(header)).toEqual([
			["Time"],
			["category1", "a"],
			["category1", "b"],
			["category2", "a"],
			["category2", "b"],
		]);
	});

	test("Don't compose if first row is empty", () => {
		const header = [
			["", "category1", "", "category2", ""],
			["X", "A", "B", "A", "B"],
			["Y", "C", "D", "E", "F"],
		];
		expect(compositeHeaderAutomatic(header)).toEqual([
			["Y"], // Note: X is ignored
			["category1", "A", "C"],
			["category1", "B", "D"],
			["category2", "A", "E"],
			["category2", "B", "F"],
		]);
	});

	test("Don't include captions which are to far on the left", () => {
		const header = [
			["X", "Caption", "category1", "category2", ""],
			["C", "", "B", "A", "B"],
			["V", "", "X", "Y", "Z"],
		];
		expect(compositeHeaderAutomatic(header)).toEqual([
			["X", "C", "V"],
			["Caption"], // Note: Only "Caption" is selected and "C" and "V" are not included
			["category1", "B", "X"],
			["category2", "A", "Y"],
			["category2", "B", "Z"],
		]);
	});
});
