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

export function SteamTrapSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 21.046, 21.047]}>
			<path
				fill="#000"
				fillOpacity="1"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".912913"
				d="M41.794 30.539a9.28 8.144 0 0 1-9.286 8.002 9.28 8.144 0 0 1-9.273-8.012"
				transform="matrix(.8398 -.70467 .79497 .9474 -41.084 4.508)"
			/>
			<path
				fill="#fff"
				fillOpacity="1"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".912913"
				d="M41.794 30.539a9.28 8.144 0 0 1-9.286 8.002 9.28 8.144 0 0 1-9.273-8.012"
				transform="matrix(.8398 -.70467 -.79497 -.9474 7.519 62.362)"
			/>
		</SymbolSvg>
	);
}

export function ConnectableSteamTrapSymbol({
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
			<SteamTrapSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePidSymbol>
	);
}
