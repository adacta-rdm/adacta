import {
	ConnectablePIDSymbol,
	type ConnectablePIDSymbolProps,
	type PIDPort,
} from "./ConnectablePIDSymbol.tsx";
import { SymbolSvg, type PIDSymbolProps } from "./SymbolSvg.tsx";

const ports = [
	{ id: "inlet", type: "target", side: "bottom", x: 0.5, y: 1 },
] satisfies readonly PIDPort[];

export function CoveredGasVentSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 33.382, 40]}>
			<g className="pid-symbol-drawing" fill="none">
				<path d="M.458 16.559C16.853.323 16.856.326 16.856.326 33.092 16.562 32.93 16.56 32.93 16.56M16.854 39.542v-26.23" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectableCoveredGasVentSymbol({
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
			<CoveredGasVentSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePIDSymbol>
	);
}
