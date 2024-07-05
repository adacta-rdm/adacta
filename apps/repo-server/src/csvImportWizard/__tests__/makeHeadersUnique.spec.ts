import { describe, test, expect } from "vitest";

import { makeHeadersUnique } from "../makeHeadersUnique";

describe("makeHeadersUnique", () => {
	test("makes headers unique", () => {
		const headers = ["a", "b", "a", "c", "b"];
		expect(makeHeadersUnique(headers)).toEqual(["a (1)", "b (1)", "a (2)", "c", "b (2)"]);
	});
});
