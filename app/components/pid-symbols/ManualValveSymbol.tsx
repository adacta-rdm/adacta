import {
	ConnectablePIDSymbol,
	type ConnectablePIDSymbolProps,
	type PIDPort,
} from "./ConnectablePIDSymbol.tsx";
import { SymbolSvg, type PIDSymbolProps } from "./SymbolSvg.tsx";

const ports = [
	{ id: "inlet", type: "target", side: "left", x: 0, y: 0.69 },
	{ id: "outlet", type: "source", side: "right", x: 1, y: 0.69 },
] satisfies readonly PIDPort[];

export function ManualValveSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 32, 32]}>
			<g className="pid-symbol-drawing">
				<path fill="none" d="M15.995 22.05V6.056M8.535 6.039H23.37" />
				<path d="M.477 28.415V15.686L16 22.05l15.522-6.364v12.729L16 22.05Z" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectableManualValveSymbol({
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
			<ManualValveSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePIDSymbol>
	);
}
