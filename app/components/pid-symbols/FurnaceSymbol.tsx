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

export function FurnaceSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 36.513, 36.496]}>
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
				d="M17.185 18.248h35.433v26.575L43.76 53.68H26.043l-8.858-8.858c0-26.575-.038-26.461 0-26.575z"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-16.637 -17.717)"
				visibility="visible"
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
				d="M22.5 18.248v24.803l5.315 5.315h14.173l5.315-5.315V18.248"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-16.637 -17.717)"
				visibility="visible"
			/>
			<path
				fill="none"
				fillOpacity="1"
				stroke="none"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".0790917"
				d="m22.491 48.34-4.308-4.308V18.185h4.375V42.78l2.748 2.747 2.747 2.747h14.73l2.79-2.79 2.789-2.791V18.185h4.286v25.937l-4.263 4.263-4.263 4.264H26.799z"
				transform="translate(-16.637 -17.717)"
			/>
		</SymbolSvg>
	);
}

export function ConnectableFurnaceSymbol({
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
			<FurnaceSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePidSymbol>
	);
}
