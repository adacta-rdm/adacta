import type { Edge, Node } from "@xyflow/react";

import type { PIDOrientation, PIDSymbolKind } from "~/app/components/PIDSymbol.tsx";
import {
	type PIDEdgeKind,
	type PIDGraph,
	type PIDInletCount,
	type PIDLength,
} from "~/app/lib/PID.ts";
import { defaultEndArrow } from "~/app/lib/PIDEdgeArrows.ts";

export type PIDNodeData = {
	kind: PIDSymbolKind;
	label: string;
	symbolKey?: string | null;
	equipmentId?: number | null;
	sampleId?: number | null;
	secondaryLabel: string | null;

	/**
	 * Whether this symbol sits inside another and omits its own caption.
	 */
	contained: boolean;
	inletCount: PIDInletCount;
	orientation: PIDOrientation;
};

export type PIDNode = Node<PIDNodeData, "pid-symbol">;

export type PIDEdgeData = {
	kind: PIDEdgeKind;
	endArrow: boolean;
	arrowPositions: number[];
	weight: number;
	material: string | null;
	innerDiameter: PIDLength | null;
	outerDiameter: PIDLength | null;
	length: PIDLength | null;
};

export type PIDEdge = Edge<PIDEdgeData, "pid-connection">;

/**
 * Returns the kind of a connection, or "pipe" when the edge carries no data.
 * React Flow permits an edge without data; every edge created by this editor
 * carries a kind, so the default applies only to an edge created elsewhere.
 */
export function edgeKind(edge: { data?: PIDEdgeData }): PIDEdgeKind {
	return edge.data?.kind ?? "pipe";
}

/**
 * Returns everything recorded about a connection, filling in what an edge
 * created outside this editor would leave empty.
 */
export function edgeData(edge: { data?: PIDEdgeData }): PIDEdgeData {
	return {
		kind: edgeKind(edge),
		endArrow: edge.data?.endArrow ?? defaultEndArrow(edgeKind(edge)),
		arrowPositions: edge.data?.arrowPositions ?? [],
		weight: edge.data?.weight ?? 1,
		material: edge.data?.material ?? null,
		innerDiameter: edge.data?.innerDiameter ?? null,
		outerDiameter: edge.data?.outerDiameter ?? null,
		length: edge.data?.length ?? null,
	};
}

export function editorNodes(value: PIDGraph): PIDNode[] {
	const nodes: PIDNode[] = value.nodes.map((node) => ({
		id: node.id,
		type: "pid-symbol",
		position: { ...node.position },
		// A symbol that sits inside another is kept within it while it is
		// dragged, and its position is measured from that symbol.
		...(node.parentId === null ? {} : { parentId: node.parentId, extent: "parent" as const }),
		data: {
			kind: node.kind,
			label: node.label,
			symbolKey: node.symbolKey ?? null,
			equipmentId: node.equipmentId ?? null,
			sampleId: node.sampleId ?? null,
			secondaryLabel: node.secondaryLabel,
			contained: node.parentId !== null,
			inletCount: node.inletCount,
			orientation: node.orientation,
		},
	}));

	return holdersFirst(nodes);
}

/**
 * Returns the given symbols together with everything inside them.
 * A symbol may hold another that holds a third, so the search continues until
 * it finds nothing further.
 */
export function withContents(nodes: PIDNode[], ids: string[]): Set<string> {
	const doomed = new Set(ids);
	let added = true;

	while (added) {
		added = false;

		for (const node of nodes) {
			if (node.parentId === undefined) continue;
			if (doomed.has(node.id)) continue;
			if (!doomed.has(node.parentId)) continue;

			doomed.add(node.id);
			added = true;
		}
	}

	return doomed;
}

/**
 * Returns the symbols with every holder before what it holds.
 * React Flow needs a symbol to exist before it places anything inside it.
 */
export function holdersFirst(nodes: PIDNode[]): PIDNode[] {
	const placed = new Set<string>();
	const ordered: PIDNode[] = [];
	let remaining = nodes;

	while (remaining.length > 0) {
		const ready = remaining.filter(
			(node) => node.parentId === undefined || placed.has(node.parentId),
		);

		// A symbol naming a holder that is not in the diagram would otherwise
		// loop here. The route rejects such a diagram, so this only guards
		// against a graph built in some other way.
		if (ready.length === 0) return [...ordered, ...remaining];

		for (const node of ready) placed.add(node.id);

		ordered.push(...ready);
		remaining = remaining.filter((node) => !placed.has(node.id));
	}

	return ordered;
}

export function editorEdges(value: PIDGraph): PIDEdge[] {
	return value.edges.map((edge) => ({
		id: edge.id,
		type: "pid-connection",
		data: {
			kind: edge.kind,
			endArrow: edge.endArrow,
			arrowPositions: edge.arrowPositions,
			weight: edge.weight,
			material: edge.material,
			innerDiameter: edge.innerDiameter,
			outerDiameter: edge.outerDiameter,
			length: edge.length,
		},
		source: edge.source,
		target: edge.target,
		sourceHandle: edge.sourceHandle,
		targetHandle: edge.targetHandle,
	}));
}

export function pidGraph(nodes: PIDNode[], edges: PIDEdge[]): PIDGraph {
	return {
		nodes: nodes.map((node) => ({
			id: node.id,
			kind: node.data.kind,
			label: node.data.label,
			symbolKey: node.data.symbolKey ?? null,
			equipmentId: node.data.equipmentId ?? null,
			sampleId: node.data.sampleId ?? null,
			secondaryLabel: node.data.secondaryLabel,
			parentId: node.parentId ?? null,
			inletCount: node.data.inletCount,
			orientation: node.data.orientation,
			position: { ...node.position },
		})),
		edges: edges.map((edge) => ({
			id: edge.id,
			kind: edgeKind(edge),
			endArrow: edge.data?.endArrow ?? defaultEndArrow(edgeKind(edge)),
			arrowPositions: edge.data?.arrowPositions ?? [],
			weight: edge.data?.weight ?? 1,
			material: edge.data?.material ?? null,
			innerDiameter: edge.data?.innerDiameter ?? null,
			outerDiameter: edge.data?.outerDiameter ?? null,
			length: edge.data?.length ?? null,
			source: edge.source,
			target: edge.target,
			sourceHandle: edge.sourceHandle ?? null,
			targetHandle: edge.targetHandle ?? null,
		})),
	};
}
