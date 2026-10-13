import { describe, expect, test } from "bun:test";

import { splitPIDEdgeData, unambiguousSplitCandidate } from "~/app/lib/PIDEdgeSplit.ts";
import type { PIDEdgeData } from "~/app/lib/PIDEditorGraph.ts";

const pipe: PIDEdgeData = {
	kind: "pipe",
	endArrow: true,
	arrowPositions: [25, 75],
	weight: 2,
	material: "PTFE",
	innerDiameter: { value: 4, unit: "mm" },
	outerDiameter: { value: 6, unit: "mm" },
	length: { value: 8, unit: "m" },
};

describe("splitPIDEdgeData", () => {
	test("divides length and arrow positions while retaining pipe measurements", () => {
		const parts = splitPIDEdgeData(pipe, 0.4);

		expect(parts).toEqual([
			{
				...pipe,
				endArrow: false,
				arrowPositions: [63],
				length: { value: 3.2, unit: "m" },
			},
			{
				...pipe,
				arrowPositions: [58],
				length: { value: 4.8, unit: "m" },
			},
		]);
	});

	test("keeps a traced connection without an endpoint arrow", () => {
		const parts = splitPIDEdgeData({ ...pipe, kind: "traced", endArrow: false }, 0.5);

		expect(parts?.map((part) => [part.kind, part.endArrow, part.length?.value])).toEqual([
			["traced", false, 4],
			["traced", false, 4],
		]);
	});

	test("keeps the jacketed connection kind and its downstream endpoint arrow", () => {
		const parts = splitPIDEdgeData({ ...pipe, kind: "jacketed" }, 0.5);

		expect(parts?.map((part) => [part.kind, part.endArrow])).toEqual([
			["jacketed", false],
			["jacketed", true],
		]);
	});

	test("rejects a split at either endpoint", () => {
		const atSource = splitPIDEdgeData(pipe, 0);
		const atTarget = splitPIDEdgeData(pipe, 1);

		expect(atSource).toBeUndefined();
		expect(atTarget).toBeUndefined();
	});
});

describe("unambiguousSplitCandidate", () => {
	test("selects the nearest line when another line is farther away", () => {
		const selected = unambiguousSplitCandidate(
			[
				{ id: "far", distance: 5 },
				{ id: "near", distance: 1 },
			],
			2,
		);

		expect(selected?.id).toBe("near");
	});

	test("leaves a crossing undecided when both lines are equally close", () => {
		const selected = unambiguousSplitCandidate(
			[
				{ id: "horizontal", distance: 0 },
				{ id: "vertical", distance: 0 },
			],
			2,
		);

		expect(selected).toBeUndefined();
	});
});
