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

export function CoolingTowerSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 43.077, 56]}>
			<g className="pid-symbol-drawing">
				<path d="M.693 42.822h41.69v12.484H.694z" />
				<path d="M.635 42.441 11.086.635H31.99L42.441 42.44" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectableCoolingTowerSymbol({
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
			<CoolingTowerSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePIDSymbol>
	);
}
