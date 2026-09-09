import {
	ConnectablePIDSymbol,
	type ConnectablePIDSymbolProps,
	type PIDPort,
} from "./ConnectablePIDSymbol.tsx";
import { SymbolSvg, type PIDSymbolProps } from "./SymbolSvg.tsx";

const ports = [
	{ id: "outlet", type: "source", side: "top", x: 0.5, y: 0 },
] satisfies readonly PIDPort[];

export function GasBottleSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 17.717, 46.776]}>
			<g className="pid-symbol-drawing">
				<path d="M.531 14.355v31.89H17.185v-31.89" />
				<path d="M17.185 13.823a8.327 5.315 0 0 0-4.164-4.602 8.327 5.315 0 0 0-8.326 0A8.327 5.315 0 0 0 .53 13.823" />
				<path d="M4.075 9.162v-4.906" />
				<path d="M13.642 9.162v-4.906" />
				<path d="M13.642 4.965a4.783 4.253 0 0 0-2.393-3.682 4.783 4.253 0 0 0-4.783 0 4.783 4.253 0 0 0-2.392 3.682" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectableGasBottleSymbol({
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
			<GasBottleSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePIDSymbol>
	);
}
