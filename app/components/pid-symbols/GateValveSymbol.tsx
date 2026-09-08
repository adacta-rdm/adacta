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

export function GateValveSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 33.236, 15.541]}>
			<path
				fill="#fff"
				fillOpacity="1"
				fillRule="evenodd"
				stroke="none"
				d="M19.715 27.094v14.478l32.172-14.478v14.478z"
				transform="translate(-19.183 -26.563)"
			/>
			<path
				fill="none"
				stroke="#000"
				strokeDasharray="none"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeMiterlimit="10"
				strokeOpacity="1"
				strokeWidth="1.06299"
				d="M19.715 27.094v14.478l32.172-14.478v14.478zm16.123 14.478V27.094"
				transform="translate(-19.183 -26.563)"
			/>
		</SymbolSvg>
	);
}

export function ConnectableGateValveSymbol({
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
			<GateValveSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePidSymbol>
	);
}
