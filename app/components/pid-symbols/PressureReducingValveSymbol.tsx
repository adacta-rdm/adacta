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

export function PressureReducingValveSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 29.409, 22.595]}>
			<g transform="translate(-20.507 -27.265)">
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
					d="M49.385 49.385 21.038 35.212v7.086l28.347-14.173v21.26"
					color="#000"
					display="inline"
					overflow="visible"
					visibility="visible"
				/>
				<circle
					cx="16.831"
					cy="16.831"
					r=".886"
					fill="#000"
					fillOpacity="1"
					stroke="#000"
					strokeDasharray="none"
					strokeMiterlimit="4"
					strokeOpacity="1"
					strokeWidth=".814961"
					transform="translate(-3.125 7.505)scale(1.86986)"
				/>
				<path
					fill="none"
					fillOpacity="1"
					stroke="none"
					strokeDasharray="none"
					strokeDashoffset="0"
					strokeMiterlimit="4"
					strokeOpacity="1"
					strokeWidth=".111853"
					d="m39.302 44.026-9.617-4.817-.05-.428-.05-.428 9.699-4.85c5.334-2.666 9.727-4.849 9.762-4.849s.063 4.546.063 10.102-.043 10.098-.095 10.094-4.422-2.174-9.712-4.824"
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
					d="M21.582 38.756c0-1.389.028-2.525.063-2.525.034 0 1 .468 2.146 1.04l2.085 1.04v.89l-2.085 1.04c-1.146.572-2.112 1.04-2.146 1.04-.035 0-.063-1.136-.063-2.525zm18.12 5.156a2767 2767 0 0 1-8.854-4.444 9 9 0 0 1-.077-.69l-.062-.67 8.947-4.475c4.921-2.46 9.004-4.474 9.074-4.474.083 0 .127 3.266.127 9.597 0 7.597-.033 9.595-.158 9.59-.087-.004-4.136-2-8.997-4.434z"
					opacity="1"
				/>
			</g>
		</SymbolSvg>
	);
}

export function ConnectablePressureReducingValveSymbol({
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
			<PressureReducingValveSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePidSymbol>
	);
}
