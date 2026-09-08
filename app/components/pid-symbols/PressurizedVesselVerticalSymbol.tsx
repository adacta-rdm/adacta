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

export function PressurizedVesselVerticalSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 28.551, 54.293]}>
			<path
				fill="none"
				fillOpacity="1"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".674995"
				d="M37.203 13.365a9.744 4.43 0 0 1-9.827 4.351 9.744 4.43 0 0 1-9.66-4.429"
				transform="matrix(1.40906 0 0 1.76006 -24.417 22.516)"
			/>
			<path
				fill="none"
				fillOpacity="1"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".777427"
				d="M37.203 13.365a9.744 4.43 0 0 1-9.827 4.351 9.744 4.43 0 0 1-9.66-4.429"
				transform="matrix(1.40895 0 0 -1.32692 -24.414 24.024)"
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
				d="M21.712 13.722v40.783"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-21.157 -7.778)"
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
				d="M49.163 13.713v40.792"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-21.157 -7.778)"
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
				d="M33.468 60.828c-3.578-.413-6.1-1.216-8.214-2.613-1.024-.677-2.204-1.969-2.58-2.825-.379-.86-.365-.04-.366-21.388V13.684l.233-.468c1.031-2.07 4.817-3.66 10.034-4.216 1.368-.145 4.725-.118 6.16.05 4.898.572 8.6 2.18 9.589 4.166l.233.468v20.318c-.002 22.298.04 20.607-.542 21.699-1.275 2.393-4.76 4.264-9.235 4.96-.934.144-4.525.258-5.312.167z"
				opacity="1"
				transform="translate(-21.157 -7.778)"
			/>
		</SymbolSvg>
	);
}

export function ConnectablePressurizedVesselVerticalSymbol({
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
			<PressurizedVesselVerticalSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePidSymbol>
	);
}
