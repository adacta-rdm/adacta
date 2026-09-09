import {
	ConnectablePIDSymbol,
	type ConnectablePIDSymbolProps,
	type PIDPort,
} from "./ConnectablePIDSymbol.tsx";
import { SymbolSvg, type PIDSymbolProps } from "./SymbolSvg.tsx";

const ports = [
	{ id: "inlet", type: "target", side: "left", x: 0, y: 0.5 },
	{ id: "outlet", type: "source", side: "right", x: 1, y: 0.5 },
] satisfies readonly PIDPort[];

export function HydraulicPumpSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 40, 40]}>
			<g className="pid-symbol-drawing">
				<path d="M19.73.688a19.317 19.317 0 0 1 19.59 19.029 19.317 19.317 0 0 1-19.008 19.6A19.317 19.317 0 0 1 .685 20.33 19.317 19.317 0 0 1 19.657.688" />
				<path fill="currentColor" d="m39.32 20.005-9.659-4.832v9.659z" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectableHydraulicPumpSymbol({
	nodeId,
	selected,
	orientation = 0,
	maximumSize,
	className,
}: ConnectablePIDSymbolProps) {
	return (
		<ConnectablePIDSymbol
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
		</ConnectablePIDSymbol>
	);
}
