import { describe, test, expect } from "vitest";

import { skipIndices } from "../skipIndices";

describe("skipIndices", () => {
	test("In between two skipped", () => {
		expect(skipIndices(3, [1, 4])).toBe(2);
	});

	test("In between multiple skipped", () => {
		expect(skipIndices(3, [1, 2, 4, 8])).toBe(1);
	});
});
