import { describe, expect, test } from "vitest";

import { shuffle } from "../shuffle";

describe("shuffle", () => {
	test("shuffles array", () => {
		const original = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		const shuffled = shuffle(original);
		expect(shuffled).not.toEqual(original);
		expect(shuffled.sort((a, b) => a - b)).toEqual(original);
	});

	test("shuffles string", () => {
		const original = "0123456789";
		const shuffled = shuffle(original);
		expect(shuffled).not.toEqual(original);
		expect(shuffled.split("").sort().join("")).toEqual(original);
	});
});
