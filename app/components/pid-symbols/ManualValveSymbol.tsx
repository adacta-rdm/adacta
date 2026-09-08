import {
	ConnectablePidSymbol,
	type ConnectablePidSymbolProps,
	type PidPort,
} from "./ConnectablePidSymbol.tsx";
import { SymbolSvg, type PidSymbolProps } from "./SymbolSvg.tsx";

const ports = [
	{ id: "inlet", type: "target", side: "left", x: 0, y: 0.75 },
	{ id: "outlet", type: "source", side: "right", x: 1, y: 0.75 },
] satisfies readonly PidPort[];

export function ManualValveSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 35.632, 25.939]}>
			<path
				fill="none"
				fillRule="evenodd"
				stroke="#000"
				strokeDasharray="none"
				strokeLinecap="butt"
				strokeLinejoin="miter"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth="1.06299"
				d="M18.154 47.397V33.224l34.569 14.173"
				transform="translate(-17.623 -21.95)"
			/>
			<path
				fill="none"
				fillRule="evenodd"
				stroke="#000"
				strokeDasharray="none"
				strokeLinecap="butt"
				strokeLinejoin="miter"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth="1.06299"
				d="M52.723 47.397V33.224L18.154 47.397"
				transform="translate(-17.623 -21.95)"
			/>
			<path
				fill="#fff"
				fillOpacity="1"
				fillRule="nonzero"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeLinecap="butt"
				strokeLinejoin="miter"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth="1.06299"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M35.433 40.894V22.501"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-17.623 -21.95)"
				visibility="visible"
			/>
			<path
				fill="#fff"
				fillOpacity="1"
				fillRule="nonzero"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeLinecap="butt"
				strokeLinejoin="miter"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth="1.06299"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M27.127 22.482h16.517"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-17.623 -21.95)"
				visibility="visible"
			/>
			<path
				fill="#fff"
				fillOpacity="1"
				stroke="#fff"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeLinecap="square"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".134223"
				d="M18.805 40.33c0-5.796.012-6.146.22-6.087.266.074 14.394 5.87 14.626 6.001.096.054-2.887 1.343-7.223 3.121-4.062 1.667-7.44 3.05-7.505 3.072-.073.026-.118-2.322-.118-6.107zm25.723 3.072c-4.083-1.676-7.378-3.087-7.324-3.136.054-.05 2.912-1.24 6.35-2.645s6.775-2.774 7.418-3.04l1.168-.485v6.181c0 3.4-.043 6.18-.095 6.177s-3.435-1.376-7.517-3.052z"
				opacity="1"
				transform="translate(-17.623 -21.95)"
			/>
		</SymbolSvg>
	);
}

export function ConnectableManualValveSymbol({
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
			<ManualValveSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePidSymbol>
	);
}
