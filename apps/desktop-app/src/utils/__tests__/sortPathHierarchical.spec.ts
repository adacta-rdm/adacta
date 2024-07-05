import { describe, test, expect } from "vitest";

import { sortObjects } from "../sortObjects";

describe("sortObjects", () => {
	test("sorts items in ascending order", () => {
		const input = [
			["0", "000"],
			["1", "555"],
			["0"],
			["0", "111"],
			["0", "222"],
			["0", "333"],
			["0", "444"],
			["1"],
			["1", "222"],
		];

		const result = sortObjects(input, (i) => i.join(""));

		expect(result).toEqual([
			["0"],
			["0", "000"],
			["0", "111"],
			["0", "222"],
			["0", "333"],
			["0", "444"],
			["1"],
			["1", "222"],
			["1", "555"],
		]);
	});
});
