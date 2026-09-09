import {
	ConnectablePIDSymbol,
	type ConnectablePIDSymbolProps,
	type PIDPort,
} from "./ConnectablePIDSymbol.tsx";
import { SymbolSvg, type PIDSymbolProps } from "./SymbolSvg.tsx";

const ports = [
	{ id: "inlet", type: "target", side: "left", x: 0, y: 0.5 },
	{ id: "outlet", type: "source", side: "right", x: 1, y: 0.5 },
] satisfies readonly PIDPort[];

export function BackdraftDamperSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 32, 17.687]}>
			<g className="pid-symbol-drawing">
				<path d="M2.865 2.868h28.634v14.318H2.865z" />
				<path fill="none" d="m2.865 2.868 28.634 14.318" />
				<path
					fill="currentColor"
					d="M5.4 2.88a2.521 2.521 0 1 1-5.042 0 2.521 2.521 0 1 1 5.041 0"
				/>
			</g>
		</SymbolSvg>
	);
}

export function ConnectableBackdraftDamperSymbol({
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
			<BackdraftDamperSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePIDSymbol>
	);
}
