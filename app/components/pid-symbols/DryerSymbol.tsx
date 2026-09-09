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

export function DryerSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 46.894, 56]}>
			<g className="pid-symbol-drawing">
				<path d="M.684 9.788v45.528h45.528V9.788" />
				<path d="m46.212 10.243-6.83-9.56H7.51l-6.828 9.56" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectableDryerSymbol({
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
			<DryerSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePIDSymbol>
	);
}
