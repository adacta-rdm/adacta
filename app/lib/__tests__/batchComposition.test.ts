import { describe, expect, test } from "bun:test";

import { formatBatchComposition, groupBatchesByComposition } from "~/app/lib/batchComposition.ts";

describe("groupBatchesByComposition", () => {
	test("groups and sorts batches by active material and support", () => {
		const groups = groupBatchesByComposition([
			{ name: "Ni/SiO2", activeMaterial: "Ni", support: "SiO2" },
			{ name: "unclassified", activeMaterial: null, support: null },
			{ name: "Ni/Al2O3", activeMaterial: "Ni", support: "Al2O3" },
		]);

		expect(groups.map((group) => group.name)).toEqual(["Ni", null]);
		expect(groups[0]?.supports.map((support) => support.name)).toEqual(["Al2O3", "SiO2"]);
	});
});

describe("formatBatchComposition", () => {
	test("joins the recorded components", () => {
		expect(formatBatchComposition({ activeMaterial: "Pt", support: "Al2O3" })).toBe("Pt/Al2O3");
		expect(formatBatchComposition({ activeMaterial: null, support: null })).toBeUndefined();
	});
});
