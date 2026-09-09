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

export function BagSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 21.293, 40]}>
			<g className="pid-symbol-drawing">
				<path d="M.457 12.167v27.377h20.38V12.167" />
				<path d="M20.837 11.71a10.19 4.563 0 0 0-5.096-3.95 10.19 4.563 0 0 0-10.19 0 10.19 4.563 0 0 0-5.095 3.95" />
				<path d="M10.647 6.54 5.02.456h11.254z" />
				<path d="M10.647 6.083V0" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectableBagSymbol({
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
			<BagSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePIDSymbol>
	);
}
