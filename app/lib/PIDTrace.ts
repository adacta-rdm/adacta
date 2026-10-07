import {
	PID_EDGE_KINDS,
	type PIDGraph,
	type PIDGraphEdge,
	type PIDGraphNode,
} from "~/app/lib/PID.ts";

export type PIDTraceDiagnostic = {
	code: "cycle" | "ambiguous-direction" | "multiple-gas-sources";
	message: string;
	nodeIds: string[];
};

export type PIDSampleTrace = {
	sampleId: string;
	anchorId: string;
	inletNodeIds: string[];
	outletNodeIds: string[];
	bothSidedNodeIds: string[];
	unclassifiedNodeIds: string[];
	diagnostics: PIDTraceDiagnostic[];
};

export type PIDGasTrace = {
	nodeId: string;
	sourceNodeIds: string[];
	gasNames: string[];
	diagnostics: PIDTraceDiagnostic[];
};

type DirectedEdge = { source: string; target: string; edge: PIDGraphEdge };

const processKinds = new Set(
	(Object.keys(PID_EDGE_KINDS) as (keyof typeof PID_EDGE_KINDS)[]).filter(
		(kind) => PID_EDGE_KINDS[kind].carriesProcessFluid,
	),
);

/**
 * Derive process direction from the inlet and outlet handle names.
 */
export function directedProcessEdges(graph: PIDGraph): DirectedEdge[] {
	const directed: DirectedEdge[] = [];
	for (const edge of graph.edges) {
		if (!processKinds.has(edge.kind)) continue;
		const sourceRole = handleRole(edge.sourceHandle);
		const targetRole = handleRole(edge.targetHandle);
		if (sourceRole === "inlet" || targetRole === "outlet") {
			directed.push({ source: edge.target, target: edge.source, edge });
		} else {
			directed.push({ source: edge.source, target: edge.target, edge });
		}
	}
	return directed;
}

/**
 * Trace gas bottles upstream of an instrument or flow controller.
 */
export function traceGas(graph: PIDGraph, nodeId: string): PIDGasTrace {
	const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
	const edges = directedProcessEdges(graph);
	const upstream = reverseReachable(edges, nodeId);
	const sources = [...upstream]
		.map((id) => nodes.get(id))
		.filter((node): node is PIDGraphNode => node?.kind === "gas-bottle");
	const gasNames = [
		...new Set(
			sources.map((node) => normalizeGasName(node.secondaryLabel ?? node.label)).filter(Boolean),
		),
	];
	const diagnostics: PIDTraceDiagnostic[] = [];
	if (gasNames.length > 1) {
		diagnostics.push({
			code: "multiple-gas-sources",
			message: "More than one gas type reaches this instrument.",
			nodeIds: sources.map((node) => node.id),
		});
	}
	return { nodeId, sourceNodeIds: sources.map((node) => node.id), gasNames, diagnostics };
}

/**
 * Group equipment before and after every sample in the diagram.
 */
export function traceSamples(graph: PIDGraph): PIDSampleTrace[] {
	const edges = directedProcessEdges(graph);
	const equipment = graph.nodes.filter(
		(node) => node.equipmentId !== null && node.kind !== "sample",
	);
	return graph.nodes
		.filter((node) => node.kind === "sample")
		.map((sample) => {
			const anchorId = sample.parentId ?? sample.id;
			const downstream = reachable(edges, anchorId);
			const upstream = reverseReachable(edges, anchorId);
			const inletNodeIds = equipment
				.filter((node) => node.id !== anchorId && upstream.has(node.id) && !downstream.has(node.id))
				.map((node) => node.id);
			const outletNodeIds = equipment
				.filter((node) => node.id !== anchorId && downstream.has(node.id) && !upstream.has(node.id))
				.map((node) => node.id);
			const bothSidedNodeIds = equipment
				.filter((node) => node.id !== anchorId && upstream.has(node.id) && downstream.has(node.id))
				.map((node) => node.id);
			const classified = new Set([
				...inletNodeIds,
				...outletNodeIds,
				...bothSidedNodeIds,
				anchorId,
			]);
			const diagnostics: PIDTraceDiagnostic[] = [];
			const cycleNodes = [...bothSidedNodeIds];
			if (cycleNodes.length > 0)
				diagnostics.push({
					code: "cycle",
					message: "A device is reachable from both sides of the sample.",
					nodeIds: cycleNodes,
				});
			return {
				sampleId: sample.id,
				anchorId,
				inletNodeIds,
				outletNodeIds,
				bothSidedNodeIds,
				unclassifiedNodeIds: equipment
					.filter((node) => !classified.has(node.id))
					.map((node) => node.id),
				diagnostics,
			};
		});
}

/**
 * Normalize gas bottle labels. For example, `H₂ Gas Bottle` becomes `H2`.
 */
export function normalizeGasName(value: string): string {
	const subscripts: Record<string, string> = {
		"₀": "0",
		"₁": "1",
		"₂": "2",
		"₃": "3",
		"₄": "4",
		"₅": "5",
		"₆": "6",
		"₇": "7",
		"₈": "8",
		"₉": "9",
	};
	const normalized = value.trim().replace(/[₀-₉]/g, (digit) => subscripts[digit] ?? digit);
	return normalized.replace(/\s*(?:gas\s*)?bottle\s*$/i, "").trim() || normalized;
}

function handleRole(handle: string | null): "inlet" | "outlet" | undefined {
	if (!handle) return;
	if (handle.includes("inlet")) return "inlet";
	if (handle.includes("outlet") || handle === "branch") return "outlet";
}

function reachable(edges: DirectedEdge[], start: string): Set<string> {
	return walk(edges, start, false);
}

function reverseReachable(edges: DirectedEdge[], start: string): Set<string> {
	return walk(
		edges.map((edge) => ({ ...edge, source: edge.target, target: edge.source })),
		start,
		true,
	);
}

function walk(edges: DirectedEdge[], start: string, includeStart: boolean): Set<string> {
	const seen = new Set<string>(includeStart ? [start] : []);
	const queue = [start];
	while (queue.length > 0) {
		const current = queue.shift()!;
		for (const edge of edges) {
			if (edge.source !== current || seen.has(edge.target)) continue;
			seen.add(edge.target);
			queue.push(edge.target);
		}
	}
	return seen;
}
