import {
	ConnectablePidSymbol,
	type ConnectablePidSymbolProps,
	type PidPort,
} from "./ConnectablePidSymbol.tsx";
import { SymbolSvg, type PidSymbolProps } from "./SymbolSvg.tsx";

const ports = [
	{ id: "inlet", type: "target", side: "top", x: 0.64, y: 0 },
	{ id: "outlet-left", type: "source", side: "bottom", x: 0.03, y: 1 },
	{ id: "outlet-right", type: "source", side: "bottom", x: 0.66, y: 1 },
] satisfies readonly PidPort[];

export function ThreeWayValveSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 28.309, 37]}>
			<path fill="none" stroke="#000" d="m.809.5 18 36h-18l18-36Zm9 18 18-9v18z" />
		</SymbolSvg>
	);
}

export function ConnectableThreeWayValveSymbol({
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
			<ThreeWayValveSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePidSymbol>
	);
}
