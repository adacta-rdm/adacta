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

export function CoolerSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, -6.929, 51.742, 56.601]} bodySize={40}>
			<g className="pid-symbol-drawing" fill="none">
				<path d="m7.112-6.928-.254 56.6" />

				{/* One path gives every bend a single join when the diagram is magnified. */}
				<path d="M51.742 4.374H24.606V14.5h7.853v11.146h-8.061v10.733h27.344" />
				<circle cx="20" cy="20" r="20" fill="none" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectableCoolerSymbol({
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
			<CoolerSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePIDSymbol>
	);
}
