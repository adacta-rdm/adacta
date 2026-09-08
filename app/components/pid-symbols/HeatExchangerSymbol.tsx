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

export function HeatExchangerSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 40.039, 31.815]}>
			<g transform="translate(-15.413 -19.557)">
				<ellipse
					cx="36.027"
					cy="29.571"
					fill="#fff"
					fillOpacity="1"
					stroke="#000"
					strokeDasharray="none"
					strokeDashoffset="0"
					strokeMiterlimit="4"
					strokeOpacity="1"
					strokeWidth=".481654"
					rx="5.491"
					ry="8.973"
					transform="matrix(2.82124 0 0 1.72643 -66.238 -15.589)"
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
					d="M15.945 35.433h7.086l5.315-8.858L42.52 44.29l5.315-8.858h7.086"
					color="#000"
					display="inline"
					opacity="1"
					overflow="visible"
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
					d="M54.921 33.661v3.544"
					color="#000"
					display="inline"
					opacity="1"
					overflow="visible"
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
					d="M15.945 33.661v3.544"
					color="#000"
					display="inline"
					opacity="1"
					overflow="visible"
					visibility="visible"
				/>
			</g>
		</SymbolSvg>
	);
}

export function ConnectableHeatExchangerSymbol({
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
			<HeatExchangerSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePidSymbol>
	);
}
