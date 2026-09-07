import { describe, expect, test } from "bun:test";

import { compareSpecifications } from "~/app/lib/specificationComparison.ts";

function product(...pairs: [string, string][]) {
	return { specifications: pairs.map(([name, value]) => ({ name, value })) };
}

describe("compareSpecifications", () => {
	test("separates the lines every product agrees on from the rest", () => {
		const comparison = compareSpecifications([
			product(["Calibration gas", "N₂"], ["Accuracy", "±0.5%"]),
			product(["Calibration gas", "H₂"], ["Accuracy", "±0.5%"]),
		]);

		expect(comparison.shared).toEqual([{ name: "Accuracy", value: "±0.5%" }]);
		expect(comparison.varying).toEqual(["Calibration gas"]);
	});

	test("treats a line one product is missing as one that varies", () => {
		// Hoisting it would claim the second product has a value it never stated.
		const comparison = compareSpecifications([
			product(["Operating pressure", "64 bar"], ["Accuracy", "±0.5%"]),
			product(["Accuracy", "±0.5%"]),
		]);

		expect(comparison.shared).toEqual([{ name: "Accuracy", value: "±0.5%" }]);
		expect(comparison.varying).toEqual(["Operating pressure"]);
	});

	test("keeps the order in which the lines first appear", () => {
		const comparison = compareSpecifications([
			product(["Flow", "10"], ["Gas", "N₂"], ["Accuracy", "±0.5%"]),
			product(["Flow", "20"], ["Gas", "H₂"], ["Accuracy", "±0.5%"]),
		]);

		expect(comparison.varying).toEqual(["Flow", "Gas"]);
	});

	test("calls every line shared when there is one product", () => {
		const comparison = compareSpecifications([product(["Flow", "10"], ["Gas", "N₂"])]);

		expect(comparison.varying).toEqual([]);
		expect(comparison.shared).toHaveLength(2);
	});

	test("describes an empty family", () => {
		expect(compareSpecifications([])).toEqual({ shared: [], varying: [] });
	});
});
