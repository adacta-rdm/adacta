export type PIDOrientation = 0 | 1 | 2 | 3;
export type PIDInletCount = 1 | 2;

export interface PIDGraph {
	nodes: PIDGraphNode[];
	edges: PIDGraphEdge[];
}

export interface PIDGraphNode {
	id: string;
	kind: PIDSymbolKind;
	label: string;
	symbolKey?: string | null;
	equipmentId?: number | null;
	sampleId?: number | null;

	/**
	 * A second line of text, used by the symbols that carry two.
	 *
	 * An instrument is drawn as a circle holding what it does above what it is
	 * called. For example, a mass flow controller on the hydrogen line reads
	 * "MFC" above "H2". Every other symbol leaves this empty and shows its label
	 * below the drawing.
	 */
	secondaryLabel: string | null;

	/**
	 * The symbol this one sits inside, where it sits inside one.
	 *
	 * A thermocouple measures at a place within a reactor rather than at the
	 * reactor as a whole. A junction placed inside the reactor marks that place,
	 * and the caption line from the instrument ends there. The position of such
	 * a symbol is measured from the corner of the symbol that holds it, so it
	 * travels with it.
	 */
	parentId: string | null;

	/**

	 * The number of inlets on a three-way valve. Other symbols keep the default of one.

	 */
	inletCount: PIDInletCount;
	orientation: PIDOrientation;
	position: { x: number; y: number };
}

export interface PIDGraphEdge {
	id: string;
	kind: PIDEdgeKind;
	endArrow: boolean;
	arrowPositions: number[];

	/**
	 * How heavy the line is drawn, from 1 to 3.
	 *
	 * A main line is drawn heavier than a branch, which lets a reader follow the
	 * principal path through a crowded diagram. For example, the feed header
	 * carries weight 3 while the sampling line off it carries weight 1. The
	 * weight says nothing about the bore of the pipe.
	 */
	weight: number;

	/**
	 * What the pipe is made of, as the laboratory writes it. For example,
	 * "stainless steel 1.4571" or "PTFE". Empty where nobody has recorded it.
	 */
	material: string | null;

	/**
	 * The bore of the pipe, the outside of the pipe, and how long the run is.
	 *
	 * A pressure drop is calculated from the bore and the length, so these are
	 * measurements of the equipment. The weight above is only how heavy the
	 * line is drawn.
	 */
	innerDiameter: PIDLength | null;
	outerDiameter: PIDLength | null;
	length: PIDLength | null;

	source: string;
	target: string;
	sourceHandle: string | null;
	targetHandle: string | null;
}

/**
 * A length as it was written down, together with its unit.
 *
 * The unit is kept rather than converted, because a tube ordered as 1/4 inch
 * is recorded as 1/4 inch. A conversion belongs to whatever calculates with
 * the value.
 */
export interface PIDLength {
	value: number;
	unit: PIDLengthUnit;
}

export type PIDLengthUnit = "mm" | "cm" | "m" | "in" | "ft";

/**
 * The units a length may be given in, in the order the editor offers them.
 */
export const PID_LENGTH_UNITS = ["mm", "cm", "m", "in", "ft"] as const satisfies PIDLengthUnit[];

/**
 * The kind of a connection determines how its line is drawn.
 *
 * For example, a jacketed pipe is drawn as two parallel lines. A reader can
 * therefore distinguish it from a plain pipe. The kind does not restrict which
 * symbols may be connected.
 */
export type PIDEdgeKind = "pipe" | "jacketed" | "traced" | "electrical" | "caption";

/**
 * The connection kinds the application supports, with the name the editor
 * shows for each one.
 *
 * The PIDEdgeKind table stores these keys so that a connection can carry a
 * foreign key. The SQL baseline inserts the keys into the application database.
 * A changed list therefore requires a new baseline and a database reset.
 */
export const PID_EDGE_KINDS = {
	pipe: {
		name: "Pipe",
		description: "Process fluid travels from one symbol to the other.",
		carriesProcessFluid: true,
		supportsArrows: true,
	},

	jacketed: {
		name: "Jacketed",
		description: "A pipe enclosed by a second pipe that heats or cools it.",
		carriesProcessFluid: true,
		supportsArrows: true,
	},

	traced: {
		name: "Traced",
		description:
			"A pipe with a tracer line beside it that heats or cools it. Steam tracing " +
			"and electric tracing are both drawn this way.",
		carriesProcessFluid: true,
		supportsArrows: true,
	},

	electrical: {
		name: "Electrical wiring",
		description: "An electrical signal or power connection drawn as a dashed line.",
		carriesProcessFluid: false,
		supportsArrows: false,
	},

	caption: {
		name: "Caption",
		description: "A note attached to a symbol. No process fluid travels along it.",
		carriesProcessFluid: false,
		supportsArrows: false,
	},
} satisfies Record<
	PIDEdgeKind,
	{
		name: string;
		description: string;
		carriesProcessFluid: boolean;
		supportsArrows: boolean;
	}
>;

export type PIDSymbolKind =
	| "instrument"
	| "junction"
	| "note"
	| "sample"
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
