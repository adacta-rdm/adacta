import { describe, expect, test } from "bun:test";

import type { PIDGraph } from "~/app/lib/PID.ts";
import { normalizeGasName, traceGas, traceSamples } from "~/app/lib/PIDTrace.ts";

function graph(): PIDGraph {
	return {
		nodes: [
			{
				id: "bottle",
				kind: "gas-bottle",
				label: "H₂ Gas Bottle",
				symbolKey: null,
				equipmentId: 1,
				sampleId: null,
				secondaryLabel: null,
				parentId: null,
				inletCount: 1,
				orientation: 0,
				position: { x: 0, y: 0 },
			},
			{
				id: "mfc",
				kind: "instrument",
				label: "MFC",
				symbolKey: null,
				equipmentId: 2,
				sampleId: null,
				secondaryLabel: null,
				parentId: null,
				inletCount: 1,
				orientation: 0,
				position: { x: 1, y: 0 },
			},
			{
				id: "reactor",
				kind: "furnace",
				label: "Furnace",
				symbolKey: null,
				equipmentId: 3,
				sampleId: null,
				secondaryLabel: null,
				parentId: null,
				inletCount: 1,
				orientation: 0,
				position: { x: 2, y: 0 },
			},
			{
				id: "sample",
				kind: "sample",
				label: "Sample",
				symbolKey: null,
				equipmentId: null,
				sampleId: 9,
				secondaryLabel: null,
				parentId: "reactor",
				inletCount: 1,
				orientation: 0,
				position: { x: 0, y: 0 },
			},
			{
				id: "ftir",
				kind: "instrument",
				label: "FTIR",
				symbolKey: null,
				equipmentId: 4,
				sampleId: null,
				secondaryLabel: null,
				parentId: null,
				inletCount: 1,
				orientation: 0,
				position: { x: 3, y: 0 },
			},
		],
		edges: [
			edge("bottle-mfc", "bottle", "mfc", "outlet", "inlet"),
			edge("mfc-reactor", "mfc", "reactor", "outlet", "inlet"),
			edge("reactor-ftir", "reactor", "ftir", "outlet", "inlet"),
		],
	};
}

function edge(
	id: string,
	source: string,
	target: string,
	sourceHandle: string,
	targetHandle: string,
) {
	return {
		id,
		kind: "pipe" as const,
		endArrow: true,
		arrowPositions: [],
		weight: 1,
		material: null,
		innerDiameter: null,
		outerDiameter: null,
		length: null,
		source,
		target,
		sourceHandle,
		targetHandle,
	};
}

describe("P&ID tracing", () => {
	test("normalizes gas labels and traces upstream bottles", () => {
		expect(normalizeGasName("H₂ Gas Bottle")).toBe("H2");
		expect(traceGas(graph(), "mfc")).toMatchObject({ sourceNodeIds: ["bottle"], gasNames: ["H2"] });
	});

	test("groups equipment relative to a contained sample", () => {
		expect(traceSamples(graph())[0]).toMatchObject({
			inletNodeIds: ["bottle", "mfc"],
			outletNodeIds: ["ftir"],
			bothSidedNodeIds: [],
			unclassifiedNodeIds: [],
		});
	});

	test("ignores non-process edges", () => {
		const value = graph();
		value.edges.push({
			...edge("caption", "mfc", "ftir", "leader", "leader"),
			kind: "caption",
			endArrow: false,
		});
		expect(traceSamples(value)[0]?.outletNodeIds).toEqual(["ftir"]);
	});
});
