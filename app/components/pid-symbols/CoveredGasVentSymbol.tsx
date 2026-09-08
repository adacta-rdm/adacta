import {
	ConnectablePidSymbol,
	type ConnectablePidSymbolProps,
	type PidPort,
} from "./ConnectablePidSymbol.tsx";
import { SymbolSvg, type PidSymbolProps } from "./SymbolSvg.tsx";

const ports = [
	{ id: "inlet", type: "target", side: "bottom", x: 0.5, y: 1 },
] satisfies readonly PidPort[];

export function CoveredGasVentSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 36.426, 43.648]}>
			<path
				fill="none"
				stroke="#000"
				strokeDasharray="none"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".262205"
				d="M42.52 24.803Z"
				transform="translate(-17.217 -17.364)"
			/>
			<path
				fill="none"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth="1"
				d="M17.717 35.433C35.607 17.717 35.61 17.72 35.61 17.72c17.717 17.716 17.54 17.714 17.54 17.714M35.608 60.512V31.89"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-17.217 -17.364)"
				visibility="visible"
			/>
		</SymbolSvg>
	);
}

export function ConnectableCoveredGasVentSymbol({
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
			<CoveredGasVentSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePidSymbol>
	);
}
