import {
	ConnectablePidSymbol,
	type ConnectablePidSymbolProps,
	type PidPort,
} from "./ConnectablePidSymbol.tsx";
import { SymbolSvg, type PidSymbolProps } from "./SymbolSvg.tsx";

const ports = [
	{ id: "inlet", type: "target", side: "left", x: 0, y: 0.5 },
	{ id: "outlet", type: "source", side: "right", x: 1, y: 0.5 },
] satisfies readonly PidPort[];

export function PumpSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[-2, -2, 2.06, 2.06]}>
			<g stroke="#000" strokeWidth=".06" transform="translate(-.97 -.97)">
				<circle r="1" fill="#fff" />
				<path fill="none" strokeLinejoin="bevel" d="m0-1 1 1-1 1" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectablePumpSymbol({
	nodeId,
	selected,
	orientation = 0,
	maximumSize,
	className,
}: ConnectablePidSymbolProps) {
	return (
		<ConnectablePidSymbol
			nodeId={nodeId}
			selected={selected}
			orientation={orientation}
			ports={ports}
		>
			<PumpSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePidSymbol>
	);
}
