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

export function BackdraftDamperSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 39.598, 21.886]}>
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
				d="M3.545 3.549h35.433v17.717H3.545z"
			/>
			<path
				fill="none"
				fillOpacity=".75"
				fillRule="evenodd"
				stroke="#000"
				strokeDasharray="none"
				strokeLinecap="round"
				strokeLinejoin="miter"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth="1.24016"
				d="m3.545 3.549 35.433 17.717"
			/>
			<path
				fill="#000"
				fillOpacity="1"
				fillRule="evenodd"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeLinecap="butt"
				strokeLinejoin="round"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".885826"
				d="M6.681 3.563a3.12 3.12 0 1 1-6.238 0 3.12 3.12 0 1 1 6.238 0z"
				display="inline"
			/>
		</SymbolSvg>
	);
}

export function ConnectableBackdraftDamperSymbol({
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
			<BackdraftDamperSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePidSymbol>
	);
}
