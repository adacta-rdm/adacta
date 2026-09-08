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

export function CoolingTowerSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 35.433, 46.063]}>
			<path
				fill="#fff"
				fillOpacity="1"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth="1.13996"
				d="M18.287 47.625H52.58v10.269H18.287z"
				transform="translate(-17.717 -12.402)"
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
				strokeWidth="1.04447"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="m18.239 47.312 8.597-34.388H44.03l8.597 34.388"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-17.717 -12.402)"
				visibility="visible"
			/>
		</SymbolSvg>
	);
}

export function ConnectableCoolingTowerSymbol({
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
			<CoolingTowerSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePidSymbol>
	);
}
