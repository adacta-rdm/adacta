import {
	ConnectablePIDSymbol,
	type ConnectablePIDSymbolProps,
	type PIDPort,
} from "./ConnectablePIDSymbol.tsx";
import { SymbolSvg, type PIDSymbolProps } from "./SymbolSvg.tsx";

const ports = [
	{ id: "inlet", type: "target", side: "top", x: 0.63, y: 0 },
	{ id: "outlet-left", type: "source", side: "bottom", x: 0.14, y: 1 },
	{ id: "outlet-right", type: "source", side: "bottom", x: 0.63, y: 1 },
] satisfies readonly PIDPort[];

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
			<ThreeWayValveSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePIDSymbol>
	);
}
