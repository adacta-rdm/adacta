import { describe, expect, test } from "bun:test";

import { QUANTITY_KINDS, isQuantityKind, type QuantityKindId } from "~/app/lib/quantities.ts";

describe("QUANTITY_KINDS", () => {
	test("no spelling appears twice within a quantity kind", () => {
		for (const { units } of Object.values(QUANTITY_KINDS)) {
			const spellings: string[] = Object.values(units).flat();

			expect(new Set(spellings).size).toBe(spellings.length);
		}
	});

	test("every spelling is non-empty and has no leading or trailing spaces", () => {
		// findUnit trims the text it looks up. A spelling such as " g" would
		// therefore never be found.
		for (const { units } of Object.values(QUANTITY_KINDS)) {
			for (const spelling of Object.values(units).flat()) {
				expect(spelling).not.toBe("");
				expect(spelling).toBe(spelling.trim());
			}
		}
	});
});

describe("isQuantityKind", () => {
	test("accepts a kind this system knows", () => {
		expect(isQuantityKind("VolumeFlowRate")).toBe(true);
	});

	test("rejects anything else", () => {
		expect(isQuantityKind("flux_capacitance")).toBe(false);
		expect(isQuantityKind("")).toBe(false);
	});
});

describe("the QuantityKindId type", () => {
	test("names the keys of the list", () => {
		const kind: QuantityKindId = "Temperature";

		expect(QUANTITY_KINDS[kind].name).toBe("Temperature");
	});
});
