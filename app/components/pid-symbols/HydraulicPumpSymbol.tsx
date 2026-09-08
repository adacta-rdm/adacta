import {
	ConnectablePidSymbol,
	type ConnectablePidSymbolProps,
	type PidPort,
} from "./ConnectablePidSymbol.tsx";
import { SymbolSvg, type PidSymbolProps } from "./SymbolSvg.tsx";

const ports = [
	{ id: "inlet", type: "target", side: "left", x: 0, y: 0.5 },
	{ id: "outlet", type: "source", side: "right", x: 1, y: 0.5 },
] satisfies readonly PidPort[];

export function HydraulicPumpSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 7.765, 7.764]}>
			<path
				fill="none"
				fillOpacity="1"
				stroke="#000"
				strokeDasharray="none"
				strokeLinecap="butt"
				strokeLinejoin="round"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".264375"
				d="M3.83.133a3.75 3.75 0 0 1 3.803 3.694 3.75 3.75 0 0 1-3.69 3.805 3.75 3.75 0 0 1-3.81-3.686A3.75 3.75 0 0 1 3.816.133"
			/>
			<path
				fill="#000"
				fillOpacity="1"
				fillRule="evenodd"
				stroke="#000"
				strokeLinecap="butt"
				strokeLinejoin="miter"
				strokeOpacity="1"
				strokeWidth=".264583px"
				d="m7.633 3.883-1.875-.938V4.82l1.875-.937"
			/>
		</SymbolSvg>
	);
}

export function ConnectableHydraulicPumpSymbol({
	nodeId,
	selected,
	orientation = 0,
	maximumSize,
	className,
}: ConnectablePidSymbolProps) {
	return (
		<ConnectablePidSymbol
			nodeId={nodeId}
			selected={selected}
			orientation={orientation}
			ports={ports}
		>
			<HydraulicPumpSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePidSymbol>
	);
}
