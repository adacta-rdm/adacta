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
	source: string;
	target: string;
	sourceHandle: string | null;
	targetHandle: string | null;
}

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
