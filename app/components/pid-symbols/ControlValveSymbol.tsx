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

export function ControlValveSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 32, 32]}>
			<g className="pid-symbol-drawing">
				<path fill="none" d="M16 22.05V9.966" />
				<path d="M21.837 9.913a5.837 6.237 0 0 0-5.888-6.127 5.837 6.237 0 0 0-5.787 6.237H16z" />
				<path d="M.466 28.263V15.836L16 22.05l15.534-6.214v12.427L16 22.05Z" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectableControlValveSymbol({
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
			<ControlValveSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePIDSymbol>
	);
}
