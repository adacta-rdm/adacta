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

export function BallValveSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 36.673, 18.969]}>
			<path
				fill="#fff"
				fillOpacity="1"
				fillRule="evenodd"
				stroke="#000"
				strokeDasharray="none"
				strokeLinecap="butt"
				strokeLinejoin="round"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth="1.24016"
				d="m-22.704 25.732-17.717 8.858V16.873l17.717 8.859 17.716-8.859V34.59z"
				transform="translate(41.041 -16.247)"
			/>
			<path
				fill="#fff"
				fillOpacity="1"
				fillRule="evenodd"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeLinecap="butt"
				strokeLinejoin="round"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth="1.24016"
				d="M-13.845 25.731a8.86 8.86 0 1 1-17.72 0 8.86 8.86 0 1 1 17.72 0z"
				transform="translate(41.041 -16.247)"
			/>
		</SymbolSvg>
	);
}

export function ConnectableBallValveSymbol({
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
			<BallValveSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePidSymbol>
	);
}
