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

export function UTubeHeatExchangerSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 40.941, 19.046]} bodySize={40}>
			<g className="pid-symbol-drawing">
				<path d="M.47.471h40v18.105h-40z" />
				<path
					fill="none"
					d="M4.78.719V18.88M29.79 3.762a5.908 5.763 0 0 1 5.807 5.812 5.908 5.763 0 0 1-5.909 5.713"
				/>
				<path fill="none" d="M.5 9.993h4.11m.25-6.319 25.135.08M4.66 15.215l25.135.08" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectableUTubeHeatExchangerSymbol({
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
			<UTubeHeatExchangerSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePIDSymbol>
	);
}
