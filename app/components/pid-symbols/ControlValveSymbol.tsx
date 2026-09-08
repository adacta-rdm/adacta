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

export function ControlValveSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 36.496, 28.959]}>
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
				d="M17.717 49.606V35.433L53.15 49.606"
				transform="translate(-17.185 -21.14)"
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
				d="M53.15 49.606V35.433L17.717 49.606m17.716-6.99V28.738"
				transform="translate(-17.185 -21.14)"
			/>
			<path
				fill="#fff"
				fillOpacity="1"
				stroke="#000"
				strokeDasharray="none"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth="1.09477"
				d="M42.519 14.297a7.087 7.087 0 0 1-7.148 6.963 7.087 7.087 0 0 1-7.025-7.087h7.087z"
				transform="matrix(.93939 0 0 -1.00363 -15.037 21.886)"
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
				d="M18.3 42.529c0-5.85.012-6.195.22-6.118 2.248.822 15.158 6.082 15.09 6.148-.072.069-9.348 3.809-14.71 5.931l-.6.238zm26.832 3.217a1986 1986 0 0 0-7.703-3.077c-.356-.133.081-.326 7.316-3.224 4.232-1.696 7.713-3.064 7.735-3.042s.026 2.794.008 6.16l-.033 6.118z"
				transform="translate(-17.185 -21.14)"
			/>
		</SymbolSvg>
	);
}

export function ConnectableControlValveSymbol({
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
			<ControlValveSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePidSymbol>
	);
}
