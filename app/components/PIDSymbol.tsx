import { getPIDSymbolComponents } from "~/app/components/pid-symbols/PIDSymbolRegistry.ts";
import type { PIDOrientation } from "~/app/components/pid-symbols/SymbolSvg.tsx";

export const pidSymbolGroups = [
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
export type PIDSymbolKind = PIDSymbolDefinition["kind"];
export type { PIDOrientation };

const pidSymbols: readonly PIDSymbolDefinition[] = pidSymbolGroups.flatMap((group) => [
	...group.symbols,
]);
const pidSymbolMaximumSizes = {
	major: 56,
	compact: 40,
	inline: 32,
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
