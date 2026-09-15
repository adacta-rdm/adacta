import { getPIDSymbolComponents } from "~/app/components/pid-symbols/PIDSymbolRegistry.ts";
import type { PIDOrientation, PIDSymbolKind } from "~/app/lib/PID.ts";

export type { PIDOrientation, PIDSymbolKind } from "~/app/lib/PID.ts";

export const pidSymbolGroups = [
	{
		label: "Instruments and marks",
		symbols: [
			{ kind: "instrument", label: "Instrument", footprint: "compact" },
			{ kind: "junction", label: "Junction", footprint: "point" },
			{ kind: "note", label: "Note", footprint: "inline" },
			{ kind: "sample", label: "Sample", footprint: "inline" },
		],
	},
	{
		label: "Vessels and process equipment",
		symbols: [
			{ kind: "gas-bottle", label: "Gas bottle", footprint: "major" },
			{ kind: "autoclave", label: "Autoclave", footprint: "major" },
			{ kind: "half-pipe-reactor", label: "Half-pipe reactor", footprint: "major" },
			{
				kind: "horizontal-vessel",
				label: "Pressurized vessel (horizontal)",
				footprint: "major",
			},
			{
				kind: "vertical-vessel",
				label: "Pressurized vessel (vertical)",
				footprint: "major",
			},
			{ kind: "fluid-contacting-column", label: "Packed column", footprint: "major" },
			{ kind: "tray-column", label: "Tray column", footprint: "major" },
			{ kind: "dryer", label: "Dryer", footprint: "major" },
			{ kind: "dust-trap", label: "Dust trap", footprint: "compact" },
			{ kind: "bag", label: "Bag", footprint: "compact" },
			{ kind: "funnel", label: "Funnel", footprint: "compact" },
		],
	},
	{
		label: "Valves and dampers",
		symbols: [
			{ kind: "valve", label: "Valve", footprint: "inline" },
			{ kind: "three-way-valve", label: "3-way valve", footprint: "inline" },
			{ kind: "check-valve", label: "Check valve", footprint: "inline" },
			{ kind: "ball-valve", label: "Ball valve", footprint: "inline" },
			{ kind: "butterfly-valve", label: "Butterfly valve", footprint: "inline" },
			{ kind: "control-valve", label: "Control valve", footprint: "inline" },
			{ kind: "diaphragm-valve", label: "Diaphragm valve", footprint: "inline" },
			{ kind: "manual-valve", label: "Manual valve", footprint: "inline" },
			{ kind: "needle-valve", label: "Needle valve", footprint: "inline" },
			{ kind: "gate-valve", label: "Gate valve", footprint: "inline" },
			{
				kind: "pressure-reducing-valve",
				label: "Pressure-reducing valve",
				footprint: "inline",
			},
			{ kind: "backdraft-damper", label: "Backdraft damper", footprint: "inline" },
		],
	},
	{
		label: "Heat transfer",
		symbols: [
			{ kind: "furnace", label: "Furnace", footprint: "major" },
			{ kind: "cooler", label: "Cooler", footprint: "compact" },
			{ kind: "cooling-tower", label: "Cooling tower", footprint: "major" },
			{ kind: "heat-exchanger", label: "Heat exchanger", footprint: "compact" },
			{ kind: "plain-heat-exchanger", label: "Heat exchanger (plain)", footprint: "compact" },
			{
				kind: "double-pipe-heat-exchanger",
				label: "Double-pipe heat exchanger",
				footprint: "compact",
			},
			{
				kind: "straight-tube-heat-exchanger",
				label: "Fixed-tube heat exchanger",
				footprint: "compact",
			},
			{ kind: "u-tube-heat-exchanger", label: "U-tube heat exchanger", footprint: "compact" },
			{ kind: "plate-heat-exchanger", label: "Plate heat exchanger", footprint: "compact" },
			{ kind: "spiral-heat-exchanger", label: "Spiral heat exchanger", footprint: "compact" },
		],
	},
	{
		label: "Pumps, compressors, and fans",
		symbols: [
			{ kind: "pump", label: "Pump", footprint: "compact" },
			{ kind: "hydraulic-pump", label: "Hydraulic pump", footprint: "compact" },
			{
				kind: "vacuum-pump-or-compressor",
				label: "Vacuum pump or compressor",
				footprint: "compact",
			},
			{ kind: "fan", label: "Fan", footprint: "compact" },
			{ kind: "axial-fan", label: "Axial fan", footprint: "compact" },
			{ kind: "radial-fan", label: "Radial fan", footprint: "compact" },
		],
	},
	{
		label: "Fittings and outlets",
		symbols: [
			{ kind: "steam-trap", label: "Steam trap", footprint: "inline" },
			{ kind: "viewing-glass", label: "Viewing glass", footprint: "inline" },
			{ kind: "covered-gas-vent", label: "Covered gas vent", footprint: "compact" },
			{ kind: "curved-gas-vent", label: "Curved gas vent", footprint: "compact" },
		],
	},
] as const;

export type PIDSymbolDefinition = (typeof pidSymbolGroups)[number]["symbols"][number];

/**
 * Ready-made instruments, in the order they are offered.
 *
 * Each one fills the upper line of an instrument symbol. The lower line names
 * the individual device and is typed afterwards. For example, choosing TE and
 * typing "999D" gives the thermocouple that Johannes labelled "TC N" over
 * "999D".
 *
 * The codes follow ISA-5.1. The first letter is the measured quantity, and the
 * letters after it are what the device does: E a sensing element, I an
 * indicator, T a transmitter, R a recorder, C a controller. A mass flow
 * controller is therefore FIRC, because it indicates a flow, records it, and
 * controls it.
 *
 * The name beside each code says what the device is called in the laboratory,
 * so a mass flow controller can be found under that name rather than under its
 * code.
 *
 * The list is a starting point rather than a restriction. Both lines stay
 * editable, so a device with no standard code keeps its own name.
 */
export const pidInstrumentPresets = [
	{ code: "PI", label: "Pressure indicator, a gauge" },
	{ code: "PT", label: "Pressure transmitter" },
	{ code: "PIC", label: "Pressure controller" },

	{ code: "TE", label: "Thermocouple or RTD" },
	{ code: "TI", label: "Temperature indicator" },
	{ code: "TT", label: "Temperature transmitter" },
	{ code: "TIC", label: "Temperature controller" },

	{ code: "FE", label: "Flow element, an orifice plate" },
	{ code: "FI", label: "Flow indicator, a rotameter" },
	{ code: "FT", label: "Flow transmitter" },
	{ code: "FIC", label: "Flow controller" },
	{ code: "FIRC", label: "Mass flow controller" },
] as const;

const pidSymbols: readonly PIDSymbolDefinition[] = pidSymbolGroups.flatMap((group) => [
	...group.symbols,
]);
const pidSymbolMaximumSizes = {
	major: 56,
	compact: 40,
	inline: 32,

	/**
	 * A mark rather than a piece of equipment, for example the dot where two
	 * pipes meet.
	 */
	point: 10,
} as const;

export function getPIDSymbol(kind: PIDSymbolKind): PIDSymbolDefinition {
	return pidSymbols.find((symbol) => symbol.kind === kind)!;
}

/**
 * Returns the maximum rendered size for a P&ID symbol. A rendering context can
 * impose a smaller size.
 */
export function maximumSizeForPIDSymbol(kind: PIDSymbolKind, maximumSize?: number): number {
	const symbol = getPIDSymbol(kind);
	const footprintMaximumSize = pidSymbolMaximumSizes[symbol.footprint];

	if (maximumSize === undefined) return footprintMaximumSize;

	return Math.min(maximumSize, footprintMaximumSize);
}

/**
 * Draws one symbol from the P&ID symbol library.
 */
export function PIDSymbol({
	kind,
	orientation = 0,
	maximumSize,
	className,
}: {
	kind: PIDSymbolKind;
	orientation?: PIDOrientation;
	maximumSize?: number;
	className?: string;
}) {
	const Symbol = getPIDSymbolComponents(kind).Symbol;
	const renderedMaximumSize = maximumSizeForPIDSymbol(kind, maximumSize);

	return (
		<Symbol orientation={orientation} maximumSize={renderedMaximumSize} className={className} />
	);
}
