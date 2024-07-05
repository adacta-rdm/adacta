import { describe, test, expect } from "vitest";

import { indexOfNth } from "~/lib/utils/indexOfNth";
import { indexOfNthReverse } from "~/lib/utils/indexOfNthReverse";

describe("indexOfNth", () => {
	const testCases: [string, string, number, number, number][] = [
		["a-a-a-a-a", "-", 3, 5, 3],
		["a-a\n\t-a-a-a", "-", 3, 7, 5],
		["a  \na\na\n", "\n", 2, 5, 5],
		["aaa", "-", 5, -1, -1],
		["a,b,c", "\n", 2, -1, -1],
	];

	test.each(testCases)(
		"In %s get index of %s (%d. occurrence). Expected: %d.",
		(string, char, n, expectedForward) => {
			expect(indexOfNth(string, char, n)).toBe(expectedForward);
		}
	);

	test.each(testCases)(
		"In %s get index of %s (%d. occurrence backwards). Expected: %d.",
		(string, char, n, _, expectedBackwards) => {
			expect(indexOfNthReverse(string, char, n)).toBe(expectedBackwards);
		}
	);
});
