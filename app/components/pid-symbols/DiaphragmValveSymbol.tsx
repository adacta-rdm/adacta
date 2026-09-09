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

export function DiaphragmValveSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 32, 32]}>
			<g className="pid-symbol-drawing">
				<path d="M.477 22.5V9.77L16 16.135 31.522 9.77V22.5L16 16.135Z" />
				<path
					fill="none"
					d="M20.356 14.302a4.362 1.562 0 0 0-4.397-1.534 4.362 1.562 0 0 0-4.323 1.563"
				/>
			</g>
		</SymbolSvg>
	);
}

export function ConnectableDiaphragmValveSymbol({
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
			<DiaphragmValveSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePIDSymbol>
	);
}
