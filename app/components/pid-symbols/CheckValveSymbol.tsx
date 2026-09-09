import {
	ConnectablePIDSymbol,
	type ConnectablePIDSymbolProps,
	type PIDPort,
} from "./ConnectablePIDSymbol.tsx";
import { SymbolSvg, type PIDSymbolProps } from "./SymbolSvg.tsx";

const ports = [
	{ id: "inlet", type: "target", side: "left", x: 0, y: 0.52 },
	{ id: "outlet", type: "source", side: "right", x: 1, y: 0.52 },
] satisfies readonly PIDPort[];

export function CheckValveSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 32, 32]}>
			{/* The source encodes its line work as one filled shape. A shared stroke would add an outline. */}
			<path
				fill="currentColor"
				d="M5.966 7.766c-1.068 0-1.806.844-1.806 1.812 0 .917.755 1.381.755 1.381v5.044H0v1.32h4.87l.003 6.877h1.32V11.283s.665-.118.883-.416l10.904 8.108-1.476 2.136 9.114 2.556-5.312-7.94-1.56 2.136s-9.45-6.934-11.072-8.164c.056-1.04-.688-1.935-1.722-1.935Zm20.802 1.09-1.197.003.043 15.377h1.236v-6.934H32v-1.32h-5.234V8.826z"
			/>
		</SymbolSvg>
	);
}

export function ConnectableCheckValveSymbol({
	nodeId,
	selected,
	orientation = 0,
	maximumSize,
	className,
}: ConnectablePIDSymbolProps) {
	return (
		<ConnectablePIDSymbol
			nodeId={nodeId}
			selected={selected}
			orientation={orientation}
			ports={ports}
		>
			<CheckValveSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePIDSymbol>
	);
}
