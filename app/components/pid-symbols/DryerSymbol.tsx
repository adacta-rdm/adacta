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

export function DryerSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 36.496, 43.583]}>
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
				d="M17.717 21.26v35.433H53.15V21.26"
				color="#000"
				display="inline"
				opacity="1"
				overflow="visible"
				transform="translate(-17.185 -13.642)"
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
				d="m53.15 21.614-5.315-7.44H23.03l-5.314 7.44"
				color="#000"
				display="inline"
				opacity="1"
				overflow="visible"
				transform="translate(-17.185 -13.642)"
				visibility="visible"
			/>
		</SymbolSvg>
	);
}

export function ConnectableDryerSymbol({
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
			<DryerSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePidSymbol>
	);
}
