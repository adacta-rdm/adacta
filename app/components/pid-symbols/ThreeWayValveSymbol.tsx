import type { PIDInletCount } from "~/app/lib/PID.ts";

import {
	ConnectablePIDSymbol,
	type ConnectablePIDSymbolProps,
	type PIDPort,
} from "./ConnectablePIDSymbol.tsx";
import { SymbolSvg, type PIDSymbolProps } from "./SymbolSvg.tsx";

export function threeWayValvePorts(inletCount: PIDInletCount): readonly PIDPort[] {
	const singleInlet = inletCount === 1;

	return [
		{ id: "inlet", type: singleInlet ? "target" : "source", side: "right", x: 0.86903125, y: 0.5 },
		{
			id: "outlet-left",
			type: singleInlet ? "source" : "target",
			side: "top",
			x: 0.3825625,
			y: 0.0135,
		},
		{
			id: "outlet-right",
			type: singleInlet ? "source" : "target",
			side: "bottom",
			x: 0.3825625,
			y: 0.9865,
		},
	];
}

export function ThreeWayValveSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 32, 32]}>
			<g className="pid-symbol-drawing" fill="none">
				<path d="m4.458.432 15.568 31.136H4.458L20.026.432ZM12.242 16l15.567-7.784v15.568z" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectableThreeWayValveSymbol({
	nodeId,
	selected,
	inletCount = 1,
	orientation = 0,
	maximumSize,
	className,
}: ConnectablePIDSymbolProps) {
	return (
		<ConnectablePIDSymbol
			nodeId={nodeId}
			selected={selected}
			orientation={orientation}
			ports={threeWayValvePorts(inletCount)}
		>
			<ThreeWayValveSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePIDSymbol>
	);
}
