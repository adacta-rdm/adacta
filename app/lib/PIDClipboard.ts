import type { PIDGraph, PIDGraphEdge, PIDGraphNode } from "~/app/lib/PID.ts";
import { clonePIDGraph } from "~/app/lib/PIDHistory.ts";

export interface PIDClipboardFragment {
	nodes: PIDGraphNode[];
	edges: PIDGraphEdge[];
}

type Position = PIDGraphNode["position"];
type ClipboardIdKind = "node" | "edge";

/**
 * Copies selected symbols, everything nested inside them, and connections
 * whose two ends are included. A copied symbol whose holder is not included
 * becomes a root at its visible canvas position.
 */
export function copyPIDSubgraph(
	graph: PIDGraph,
	selectedNodeIds: Iterable<string>,
	detachedRootPositions: ReadonlyMap<string, Position> = new Map(),
): PIDClipboardFragment | undefined {
	const includedNodeIds = new Set(selectedNodeIds);

	for (const id of includedNodeIds) {
		if (!graph.nodes.some((node) => node.id === id)) includedNodeIds.delete(id);
	}

	let added = true;
	while (added) {
		added = false;

		for (const node of graph.nodes) {
			if (node.parentId === null || includedNodeIds.has(node.id)) continue;
			if (!includedNodeIds.has(node.parentId)) continue;

			includedNodeIds.add(node.id);
			added = true;
		}
	}

	if (includedNodeIds.size === 0) return undefined;

	const nodes = graph.nodes
		.filter((node) => includedNodeIds.has(node.id))
		.map((node) => {
			const normalized = {
				...node,
				symbolKey: node.symbolKey ?? null,
				equipmentId: node.equipmentId ?? null,
				sampleId: node.sampleId ?? null,
			};
			if (node.parentId === null || includedNodeIds.has(node.parentId)) return normalized;

			return {
				...normalized,
				parentId: null,
				position: detachedRootPositions.get(node.id) ?? node.position,
			};
		});
	const edges = graph.edges.filter(
		(edge) => includedNodeIds.has(edge.source) && includedNodeIds.has(edge.target),
	);

	return clonePIDGraph({ nodes, edges });
}

/**
 * Create a graph fragment with fresh identifiers and an offset for its roots.
 */
export function instantiatePIDClipboard(
	fragment: PIDClipboardFragment,
	createId: (kind: ClipboardIdKind) => string,
	offset: Position,
): PIDClipboardFragment {
	const nodeIds = new Map(fragment.nodes.map((node) => [node.id, createId("node")]));
	const graph = clonePIDGraph(fragment);

	return {
		nodes: graph.nodes.map((node) => ({
			...node,
			id: nodeIds.get(node.id)!,
			parentId: node.parentId === null ? null : nodeIds.get(node.parentId)!,
			position:
				node.parentId === null
					? { x: node.position.x + offset.x, y: node.position.y + offset.y }
					: node.position,
		})),
		edges: graph.edges.map((edge) => ({
			...edge,
			id: createId("edge"),
			source: nodeIds.get(edge.source)!,
			target: nodeIds.get(edge.target)!,
		})),
	};
}
