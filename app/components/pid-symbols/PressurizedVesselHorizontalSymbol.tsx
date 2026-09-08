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

export function PressurizedVesselHorizontalSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 53.206, 28.558]}>
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
				transform="matrix(0 1.40931 1.30905 0 29.505 -24.42)"
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
				d="M56.26 19.922H15.475"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-8.783 -19.382)"
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
				d="M56.26 47.4H15.466"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-8.783 -19.382)"
				visibility="visible"
			/>
			<path
				fill="none"
				fillOpacity="1"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".758798"
				d="M37.205 13.287a9.744 4.43 0 0 1-4.872 3.836 9.744 4.43 0 0 1-9.744 0 9.744 4.43 0 0 1-4.872-3.836"
				transform="matrix(0 1.40783 -1.39398 0 25.228 -24.38)"
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
				strokeWidth=".0671115"
				d="M14.933 46.743c-2.366-.658-4.289-4.607-4.905-10.074-.155-1.374-.154-4.694.001-6.03.572-4.91 2.101-8.475 4.178-9.74.702-.427-1.149-.395 21.53-.377l20.517.016.41.221c1.35.727 2.587 2.816 3.37 5.69.3 1.098.545 2.457.745 4.127.113.945.114 5.095.001 6.124-.527 4.814-1.98 8.462-3.87 9.716-.686.455 1.199.418-21.326.412-16.105-.005-20.426-.022-20.651-.085z"
				opacity="1"
				transform="translate(-8.783 -19.382)"
			/>
		</SymbolSvg>
	);
}

export function ConnectablePressurizedVesselHorizontalSymbol({
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
			<PressurizedVesselHorizontalSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePidSymbol>
	);
}
