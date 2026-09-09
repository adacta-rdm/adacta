import {
	ConnectablePIDSymbol,
	type ConnectablePIDSymbolProps,
	type PIDPort,
} from "./ConnectablePIDSymbol.tsx";
import { SymbolSvg, type PIDSymbolProps } from "./SymbolSvg.tsx";

const ports = [
	{ id: "inlet", type: "target", side: "bottom", x: 0.15, y: 1 },
] satisfies readonly PIDPort[];

export function CurvedGasVentSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 16.12, 40]}>
			<g className="pid-symbol-drawing" fill="none">
				<path d="M.591 40V8.132" />
				<path d="M15.643 7.962A7.55 7.356 0 0 0 8.03.735 7.55 7.356 0 0 0 .545 8.091" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectableCurvedGasVentSymbol({
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
			<CurvedGasVentSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePIDSymbol>
	);
}
