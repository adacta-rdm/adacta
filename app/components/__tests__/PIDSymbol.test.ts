import { describe, expect, test } from "bun:test";

import { maximumSizeForPIDSymbol } from "~/app/components/PIDSymbol.tsx";

describe("maximumSizeForPIDSymbol", () => {
	test("uses the footprint target when no context size is supplied", () => {
		expect(maximumSizeForPIDSymbol("gas-bottle")).toBe(56);
		expect(maximumSizeForPIDSymbol("pump")).toBe(40);
		expect(maximumSizeForPIDSymbol("valve")).toBe(32);
	});

	test("caps a context size at the footprint target", () => {
		expect(maximumSizeForPIDSymbol("gas-bottle", 72)).toBe(56);
		expect(maximumSizeForPIDSymbol("pump", 36)).toBe(36);
		expect(maximumSizeForPIDSymbol("valve", 48)).toBe(32);
	});

	test("uses the total envelope target for a three-way valve", () => {
		expect(maximumSizeForPIDSymbol("three-way-valve")).toBe(32);
	});
});
