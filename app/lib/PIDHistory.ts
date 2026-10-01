import type { PIDGraph } from "~/app/lib/PID.ts";

export const PID_HISTORY_LIMIT = 100;

export interface PIDHistory {
	past: PIDGraph[];
	future: PIDGraph[];
}

export interface PIDHistoryStep {
	history: PIDHistory;
	graph?: PIDGraph;
}

export function createPIDHistory(): PIDHistory {
	return { past: [], future: [] };
}

export function commitPIDHistory(
	history: PIDHistory,
	before: PIDGraph,
	after: PIDGraph,
	limit = PID_HISTORY_LIMIT,
): PIDHistory {
	if (pidGraphsEqual(before, after)) return history;

	return {
		past: [...history.past, clonePIDGraph(before)].slice(-limit),
		future: [],
	};
}

export function undoPIDHistory(history: PIDHistory, current: PIDGraph): PIDHistoryStep {
	const graph = history.past.at(-1);
	if (!graph) return { history };

	return {
		history: {
			past: history.past.slice(0, -1),
			future: [clonePIDGraph(current), ...history.future],
		},
		graph: clonePIDGraph(graph),
	};
}

export function redoPIDHistory(history: PIDHistory, current: PIDGraph): PIDHistoryStep {
	const graph = history.future[0];
	if (!graph) return { history };

	return {
		history: {
			past: [...history.past, clonePIDGraph(current)].slice(-PID_HISTORY_LIMIT),
			future: history.future.slice(1),
		},
		graph: clonePIDGraph(graph),
	};
}

export function pidGraphsEqual(left: PIDGraph, right: PIDGraph): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}

export function clonePIDGraph(graph: PIDGraph): PIDGraph {
	return {
		nodes: graph.nodes.map((node) => ({
			...node,
			position: { ...node.position },
		})),
		edges: graph.edges.map((edge) => ({
			...edge,
			arrowPositions: [...edge.arrowPositions],
			innerDiameter: edge.innerDiameter ? { ...edge.innerDiameter } : null,
			outerDiameter: edge.outerDiameter ? { ...edge.outerDiameter } : null,
			length: edge.length ? { ...edge.length } : null,
		})),
	};
}
