import {
	ConnectablePidSymbol,
	type ConnectablePidSymbolProps,
	type PidPort,
} from "./ConnectablePidSymbol.tsx";
import { SymbolSvg, type PidSymbolProps } from "./SymbolSvg.tsx";

const ports = [
	{ id: "outlet", type: "source", side: "top", x: 0.5, y: 0 },
] satisfies readonly PidPort[];

export function GasBottleSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 17.717, 46.776]}>
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
				d="M27.106 26.575v31.89H43.76v-31.89"
				color="#000"
				display="inline"
				opacity="1"
				overflow="visible"
				transform="translate(-26.575 -12.22)"
				visibility="visible"
			/>
			<path
				fill="#fff"
				fillOpacity="1"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeLinecap="square"
				strokeLinejoin="miter"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth="1.38684"
				d="M47.835 12.402a14.173 5.315 0 0 1-7.087 4.602 14.173 5.315 0 0 1-14.173 0 14.173 5.315 0 0 1-7.087-4.602"
				opacity="1"
				transform="matrix(.5875 0 0 -1 -10.918 26.225)"
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
				d="M30.65 21.382v-4.906"
				color="#000"
				display="inline"
				opacity="1"
				overflow="visible"
				transform="translate(-26.575 -12.22)"
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
				d="M40.217 21.382v-4.906"
				color="#000"
				display="inline"
				opacity="1"
				overflow="visible"
				transform="translate(-26.575 -12.22)"
				visibility="visible"
			/>
			<path
				fill="#fff"
				fillOpacity="1"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeLinecap="square"
				strokeLinejoin="miter"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".590551"
				d="M35.433 10.63a3.543 1.772 0 0 1-1.772 1.534 3.543 1.772 0 0 1-3.543 0 3.543 1.772 0 0 1-1.772-1.534"
				opacity="1"
				transform="matrix(1.35 0 0 -2.4 -34.193 30.477)"
			/>
		</SymbolSvg>
	);
}

export function ConnectableGasBottleSymbol({
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
			<GasBottleSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePidSymbol>
	);
}
