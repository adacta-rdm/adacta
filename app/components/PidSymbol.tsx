import { getPidSymbolComponents } from "~/app/components/pid-symbols/PidSymbolRegistry.ts";
import type { PidOrientation } from "~/app/components/pid-symbols/SymbolSvg.tsx";

export const pidSymbolGroups = [
	{
		label: "Vessels and process equipment",
		symbols: [
			{ kind: "gas-bottle", label: "Gas bottle" },
			{ kind: "autoclave", label: "Autoclave" },
			{ kind: "half-pipe-reactor", label: "Half-pipe reactor" },
			{ kind: "horizontal-vessel", label: "Pressurized vessel (horizontal)" },
			{ kind: "vertical-vessel", label: "Pressurized vessel (vertical)" },
			{ kind: "fluid-contacting-column", label: "Packed column" },
			{ kind: "tray-column", label: "Tray column" },
			{ kind: "dryer", label: "Dryer" },
			{ kind: "dust-trap", label: "Dust trap" },
			{ kind: "bag", label: "Bag" },
			{ kind: "funnel", label: "Funnel" },
		],
	},
	{
		label: "Valves and dampers",
		symbols: [
			{ kind: "valve", label: "Valve" },
			{ kind: "three-way-valve", label: "3-way valve" },
			{ kind: "check-valve", label: "Check valve" },
			{ kind: "ball-valve", label: "Ball valve" },
			{ kind: "butterfly-valve", label: "Butterfly valve" },
			{ kind: "control-valve", label: "Control valve" },
			{ kind: "diaphragm-valve", label: "Diaphragm valve" },
			{ kind: "manual-valve", label: "Manual valve" },
			{ kind: "needle-valve", label: "Needle valve" },
			{ kind: "gate-valve", label: "Gate valve" },
			{ kind: "pressure-reducing-valve", label: "Pressure-reducing valve" },
			{ kind: "backdraft-damper", label: "Backdraft damper" },
		],
	},
	{
		label: "Heat transfer",
		symbols: [
			{ kind: "furnace", label: "Furnace" },
			{ kind: "cooler", label: "Cooler" },
			{ kind: "cooling-tower", label: "Cooling tower" },
			{ kind: "heat-exchanger", label: "Heat exchanger" },
			{ kind: "plain-heat-exchanger", label: "Heat exchanger (plain)" },
			{ kind: "double-pipe-heat-exchanger", label: "Double-pipe heat exchanger" },
			{ kind: "straight-tube-heat-exchanger", label: "Fixed-tube heat exchanger" },
			{ kind: "u-tube-heat-exchanger", label: "U-tube heat exchanger" },
			{ kind: "plate-heat-exchanger", label: "Plate heat exchanger" },
			{ kind: "spiral-heat-exchanger", label: "Spiral heat exchanger" },
		],
	},
	{
		label: "Pumps, compressors, and fans",
		symbols: [
			{ kind: "pump", label: "Pump" },
			{ kind: "hydraulic-pump", label: "Hydraulic pump" },
			{ kind: "vacuum-pump-or-compressor", label: "Vacuum pump or compressor" },
			{ kind: "fan", label: "Fan" },
			{ kind: "axial-fan", label: "Axial fan" },
			{ kind: "radial-fan", label: "Radial fan" },
		],
	},
	{
		label: "Fittings and outlets",
		symbols: [
			{ kind: "steam-trap", label: "Steam trap" },
			{ kind: "viewing-glass", label: "Viewing glass" },
			{ kind: "covered-gas-vent", label: "Covered gas vent" },
			{ kind: "curved-gas-vent", label: "Curved gas vent" },
		],
	},
] as const;

export type PidSymbolDefinition = (typeof pidSymbolGroups)[number]["symbols"][number];
export type PidSymbolKind = PidSymbolDefinition["kind"];
export type { PidOrientation };

const pidSymbols: readonly PidSymbolDefinition[] = pidSymbolGroups.flatMap((group) => [
	...group.symbols,
]);

export function getPidSymbol(kind: PidSymbolKind): PidSymbolDefinition {
	return pidSymbols.find((symbol) => symbol.kind === kind)!;
}

/**
 * Draws one symbol from the P&ID symbol library.
 */
export function PidSymbol({
	kind,
	orientation = 0,
	maximumSize,
	className,
}: {
	kind: PidSymbolKind;
	orientation?: PidOrientation;
	maximumSize?: number;
	className?: string;
}) {
	const Symbol = getPidSymbolComponents(kind).Symbol;

	return <Symbol orientation={orientation} maximumSize={maximumSize} className={className} />;
}
