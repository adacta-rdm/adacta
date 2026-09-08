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

export function DoublePipeHeatExchangerSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 42.75, 32.358]}>
			<path
				fill="#fff"
				fillOpacity="1"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth="1.07659"
				d="M18.187 23.57h29.192v6.231H18.187z"
				transform="translate(-14.02 -19.134)"
			/>
			<path
				fill="#fff"
				fillOpacity="1"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth="1.07282"
				d="M18.069 41.113h29.283v6.185H18.069z"
				transform="translate(-14.02 -19.134)"
			/>
			<path
				fill="none"
				fillOpacity="1"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth="1.056"
				d="M65.266 30.14a10.446 7.009 0 0 1-10.536 6.887 10.446 7.009 0 0 1-10.355-7.01"
				transform="matrix(0 -.83976 1.20663 0 -2.565 62.433)"
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
				strokeWidth=".708661"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="m44.185 30.064.09 10.976"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-14.02 -19.134)"
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
				strokeWidth=".708661"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M18.455 26.815h29.013"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-14.02 -19.134)"
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
				strokeWidth=".708661"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M47.29 44.289H18.456"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-14.02 -19.134)"
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
				strokeWidth=".708661"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M21.383 23.479V19.79"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-14.02 -19.134)"
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
				strokeWidth=".708661"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M18.278 26.815h-3.816"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-14.02 -19.134)"
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
				strokeWidth=".708661"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M18.278 44.289h-3.816.178"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-14.02 -19.134)"
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
				strokeWidth=".708661"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M14.374 24.972v3.512"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-14.02 -19.134)"
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
				strokeWidth=".708661"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M14.374 42.445v3.6"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-14.02 -19.134)"
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
				strokeWidth=".708661"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M19.608 51.138h3.55"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-14.02 -19.134)"
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
				strokeWidth=".708661"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M19.488 19.488h3.543"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-14.02 -19.134)"
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
				strokeWidth=".708661"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M21.26 51.378v-3.543"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-14.02 -19.134)"
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
				strokeWidth=".09491"
				d="M47.932 42.124v-1.62h-3.3l-.024-5.044-.024-5.045h3.348v-3.062l.65.055c1.16.098 2.556.651 3.591 1.423 1.672 1.246 2.773 2.962 3.189 4.97.25 1.212.19 2.936-.143 4.05-.708 2.37-2.218 4.155-4.354 5.146-.79.366-1.578.59-2.42.687l-.513.06z"
				opacity="1"
				transform="translate(-14.02 -19.134)"
			/>
		</SymbolSvg>
	);
}

export function ConnectableDoublePipeHeatExchangerSymbol({
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
			<DoublePipeHeatExchangerSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePidSymbol>
	);
}
