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

export function ValveSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 32, 32]}>
			<g className="pid-symbol-drawing" fill="none">
				<path d="M.432 8.216v15.568L31.568 8.216v15.568Z" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectableValveSymbol({
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
			<ValveSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePIDSymbol>
	);
}
