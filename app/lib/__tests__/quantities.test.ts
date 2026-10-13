import { describe, expect, test } from "bun:test";

import { QUANTITY_KINDS, isQuantityKind, type QuantityKindId } from "~/app/lib/quantities.ts";

const entries = Object.entries(QUANTITY_KINDS);

describe("QUANTITY_KINDS", () => {
	test("every kind says how it is built out of the base quantities", () => {
		for (const [name, kind] of entries) {
			expect(Object.keys(kind.dimension).length, name).toBeGreaterThan(0);
		}
	});

	test("a temperature and a difference of temperatures are separate kinds", () => {
		// They convert differently. A difference of 5 degrees Celsius is a
		// difference of 9 degrees Fahrenheit, not 41. Merging the two would
		// make every converted difference wrong.
		expect(QUANTITY_KINDS.TemperatureDifference.dimension).toEqual(
			QUANTITY_KINDS.Temperature.dimension,
		);
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
