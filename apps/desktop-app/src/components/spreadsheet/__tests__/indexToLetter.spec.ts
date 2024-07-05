import { describe, test, expect } from "vitest";

import { indexToLetter } from "../indexToLetter";

describe("indexToLetter", () => {
	test("Single letter", () => {
		const numbers = [...Array(26).keys()];
		expect(numbers.map(indexToLetter)).toMatchSnapshot();
	});

	test("Double letters", () => {
		const numbers = [];
		const start = 26;
		for (let i = start; i < start + 26 * 26; i++) {
			numbers.push(i);
		}
		expect(numbers.map(indexToLetter)).toMatchSnapshot();
	});

	test("Tripple letters", () => {
		const numbers = [];
		const start = 26 * 26 + 26;
		for (let i = start; i < start + 26 * 26 * 26; i++) {
			numbers.push(i);
		}
		expect(numbers.map(indexToLetter)).toMatchSnapshot();
	});
});
