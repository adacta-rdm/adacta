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

export function PlainHeatExchangerSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 37.035, 28.311]}>
			<g transform="translate(-17.47 -21.278)">
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
					strokeWidth=".543067"
					rx="5.491"
					ry="8.973"
					transform="matrix(2.5022 0 0 1.5312 -58.256 -9.847)"
				/>
				<path
					fill="none"
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
					d="M54.505 26.99H27.864l8.85 8.4-8.85 8.485h26.641"
					color="#000"
					display="inline"
					overflow="visible"
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
					d="m29.541 43.057 4.06-3.886c2.112-2.02 3.852-3.708 3.867-3.751.015-.044-1.805-1.82-4.045-3.948l-4.073-3.87 6.535-.022c6.143-.022 6.543-.014 6.66.134.306.387 1.209 1.98 1.451 2.563 1.244 2.988 1.37 6.35.35 9.38-.293.87-.993 2.282-1.537 3.102l-.34.513H29.32z"
					opacity="1"
				/>
			</g>
		</SymbolSvg>
	);
}

export function ConnectablePlainHeatExchangerSymbol({
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
			<PlainHeatExchangerSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePidSymbol>
	);
}
