import { expect, describe, test } from "vitest";

import { updateArrayMinMax } from "~/apps/repo-server/src/utils/updateArrayMinMax";

describe("updateArrayMinMax", () => {
	test("updates min", () => {
		const target = [1, 2, 3];
		const source = [2, 1, 4];
		expect(updateArrayMinMax(target, source, "min")).toEqual([1, 1, 3]);
	});

	test("updates min", () => {
		const target = [1, 2, 3];
		const source = [2, 1, 4];
		expect(updateArrayMinMax(target, source, "max")).toEqual([2, 2, 4]);
	});

	test("overwrites undefined", () => {
		const target = [1, undefined, 3];
		const source = [2, 1, undefined];
		expect(updateArrayMinMax(target, source, "min")).toEqual([1, 1, 3]);
	});
});
