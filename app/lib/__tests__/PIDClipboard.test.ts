import { describe, expect, test } from "bun:test";

import type { PIDGraph, PIDGraphEdge, PIDGraphNode } from "~/app/lib/PID.ts";
import { copyPIDSubgraph, instantiatePIDClipboard } from "~/app/lib/PIDClipboard.ts";

describe("P&ID clipboard", () => {
	test("copies selected symbols, their contents, and only internal connections", () => {
		const graph = fixture();

		expect(copyPIDSubgraph(graph, ["vessel"])).toEqual({
			nodes: [graph.nodes[0], graph.nodes[1]],
			edges: [graph.edges[0]],
		});
	});

	test("detaches a copied child at its visible canvas position", () => {
		const graph = fixture();
		const absolutePositions = new Map([["instrument", { x: 140, y: 90 }]]);

		expect(copyPIDSubgraph(graph, ["instrument"], absolutePositions)?.nodes).toEqual([
			{
				...graph.nodes[1],
				parentId: null,
				position: { x: 140, y: 90 },
			},
		]);
	});

	test("returns no fragment when no symbols are selected", () => {
		expect(copyPIDSubgraph(fixture(), [])).toBeUndefined();
		expect(copyPIDSubgraph(fixture(), ["missing"])).toBeUndefined();
	});

	test("creates fresh identifiers and offsets only roots", () => {
		const fragment = copyPIDSubgraph(fixture(), ["vessel"])!;
		let nodeNumber = 0;
		let edgeNumber = 0;

		const pasted = instantiatePIDClipboard(
			fragment,
			(kind) => (kind === "node" ? `new-node-${++nodeNumber}` : `new-edge-${++edgeNumber}`),
			{ x: 20, y: 20 },
		);

		expect(pasted.nodes).toEqual([
			{ ...fragment.nodes[0], id: "new-node-1", position: { x: 120, y: 70 } },
			{
				...fragment.nodes[1],
				id: "new-node-2",
				parentId: "new-node-1",
			},
		]);
		expect(pasted.edges).toEqual([
			{
				...fragment.edges[0],
				id: "new-edge-1",
				source: "new-node-1",
				target: "new-node-2",
			},
		]);
	});

	test("deep-copies mutable connection data", () => {
		const graph = fixture();
		const copied = copyPIDSubgraph(graph, ["vessel"])!;
		copied.edges[0]!.arrowPositions.push(80);
		copied.edges[0]!.innerDiameter!.value = 99;

		expect(graph.edges[0]!.arrowPositions).toEqual([25]);
		expect(graph.edges[0]!.innerDiameter!.value).toBe(4);
	});
});

function fixture(): PIDGraph {
	const nodes: PIDGraphNode[] = [
		{
			id: "vessel",
			kind: "vertical-vessel",
			label: "V-1",
			secondaryLabel: null,
			parentId: null,
			inletCount: 1,
			orientation: 0,
			position: { x: 100, y: 50 },
		},
		{
			id: "instrument",
			kind: "instrument",
			label: "TI",
			secondaryLabel: "1",
			parentId: "vessel",
			inletCount: 1,
			orientation: 1,
			position: { x: 40, y: 40 },
		},
		{
			id: "pump",
			kind: "pump",
			label: "P-1",
			secondaryLabel: null,
			parentId: null,
			inletCount: 1,
			orientation: 0,
			position: { x: 300, y: 50 },
		},
	];
	const connection = (overrides: Partial<PIDGraphEdge>): PIDGraphEdge => ({
		id: "internal",
		kind: "pipe",
		endArrow: true,
		arrowPositions: [25],
		weight: 2,
		material: "PTFE",
		innerDiameter: { value: 4, unit: "mm" },
		outerDiameter: null,
		length: { value: 2, unit: "m" },
		source: "vessel",
		target: "instrument",
		sourceHandle: "right-source",
		targetHandle: "left-target",
		...overrides,
	});

	return {
		nodes,
		edges: [connection({}), connection({ id: "boundary", source: "instrument", target: "pump" })],
	};
}
