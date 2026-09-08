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

export function CheckValveSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 572.27, 294.58]}>
			<path d="M106.7.04c-19.1 0-32.3 15.1-32.3 32.4 0 16.4 13.5 24.7 13.5 24.7v90.2H0v23.6h87.1l.04 123h23.6v-231s11.9-2.12 15.8-7.44l195 145-26.4 38.2 163 45.7-95-142-27.9 38.2s-169-124-198-146c1-18.6-12.3-34.6-30.8-34.6Zm372 19.5-21.4.04.77 275h22.1v-124h92.1v-23.6h-93.6v-128z" />
		</SymbolSvg>
	);
}

export function ConnectableCheckValveSymbol({
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
			<CheckValveSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePidSymbol>
	);
}
