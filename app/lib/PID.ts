export type PIDOrientation = 0 | 1 | 2 | 3;

export interface PIDGraph {
	nodes: PIDGraphNode[];
	edges: PIDGraphEdge[];
}

export interface PIDGraphNode {
	id: string;
	kind: PIDSymbolKind;
	label: string;
	orientation: PIDOrientation;
	position: { x: number; y: number };
}

export interface PIDGraphEdge {
	id: string;
	kind: PIDEdgeKind;
	source: string;
	target: string;
	sourceHandle: string | null;
	targetHandle: string | null;
}

/**
 * The kind of a connection determines how its line is drawn.
 *
 * For example, a jacketed pipe is drawn as two parallel lines. A reader can
 * therefore distinguish it from a plain pipe. The kind does not restrict which
 * symbols may be connected.
 */
export type PIDEdgeKind = "pipe" | "jacketed" | "traced" | "caption";

/**
 * The connection kinds the application supports, with the name the editor
 * shows for each one.
 *
 * The PIDEdgeKind table stores these keys so that a connection can carry a
 * foreign key. RepoManager copies the keys into every repository database. A
 * new kind therefore needs no migration file.
 */
export const PID_EDGE_KINDS = {
	pipe: {
		name: "Pipe",
		description: "Process fluid travels from one symbol to the other.",
	},

	jacketed: {
		name: "Jacketed",
		description: "A pipe enclosed by a second pipe that heats or cools it.",
	},

	traced: {
		name: "Traced",
		description:
			"A pipe with a tracer line beside it that heats or cools it. Steam tracing " +
			"and electric tracing are both drawn this way.",
	},

	caption: {
		name: "Caption",
		description: "A note attached to a symbol. No process fluid travels along it.",
	},
} satisfies Record<PIDEdgeKind, { name: string; description: string }>;

export type PIDSymbolKind =
	| "gas-bottle"
	| "autoclave"
	| "half-pipe-reactor"
	| "horizontal-vessel"
	| "vertical-vessel"
	| "fluid-contacting-column"
	| "tray-column"
	| "dryer"
	| "dust-trap"
	| "bag"
	| "funnel"
	| "valve"
	| "three-way-valve"
	| "check-valve"
	| "ball-valve"
	| "butterfly-valve"
	| "control-valve"
	| "diaphragm-valve"
	| "manual-valve"
	| "needle-valve"
	| "gate-valve"
	| "pressure-reducing-valve"
	| "backdraft-damper"
	| "furnace"
	| "cooler"
	| "cooling-tower"
	| "heat-exchanger"
	| "plain-heat-exchanger"
	| "double-pipe-heat-exchanger"
	| "straight-tube-heat-exchanger"
	| "u-tube-heat-exchanger"
	| "plate-heat-exchanger"
	| "spiral-heat-exchanger"
	| "pump"
	| "hydraulic-pump"
	| "vacuum-pump-or-compressor"
	| "fan"
	| "axial-fan"
	| "radial-fan"
	| "steam-trap"
	| "viewing-glass"
	| "covered-gas-vent"
	| "curved-gas-vent";
