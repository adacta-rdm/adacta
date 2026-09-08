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

export function VacuumPumpOrCompressorSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 35.639, 35.612]}>
			<g transform="translate(-17.614 -17.627)">
				<ellipse
					cx="36.073"
					cy="34.414"
					fill="#fff"
					fillOpacity="1"
					stroke="#000"
					strokeDasharray="none"
					strokeMiterlimit="4"
					strokeOpacity="1"
					strokeWidth=".922762"
					rx="14.813"
					ry="15.192"
					transform="matrix(1.1666 0 0 1.13752 -6.65 -3.714)"
				/>
				<path
					fill="none"
					fillRule="evenodd"
					stroke="#000"
					strokeDasharray="none"
					strokeLinecap="butt"
					strokeLinejoin="miter"
					strokeMiterlimit="4"
					strokeOpacity="1"
					strokeWidth="1.06299"
					d="m28.75 51.53 23.378-12.067M28.75 19.28l23.378 12.067"
				/>
			</g>
		</SymbolSvg>
	);
}

export function ConnectableVacuumPumpOrCompressorSymbol({
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
			<VacuumPumpOrCompressorSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePidSymbol>
	);
}
