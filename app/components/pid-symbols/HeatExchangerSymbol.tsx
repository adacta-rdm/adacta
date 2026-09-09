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

export function HeatExchangerSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[-5.122, 0, 50.32, 40]} bodySize={40}>
			<g className="pid-symbol-drawing">
				<path d="M20 0a20 20 0 1 0 0 40 20 20 0 1 0 0-40" />
				<path fill="none" d="M-5.121 19.961h9.15L10.89 8.524l18.3 22.872 6.862-11.437H45.2" />
				<path fill="none" d="M45.2 17.673v4.574m-50.32-4.574v4.574" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectableHeatExchangerSymbol({
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
			<HeatExchangerSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePIDSymbol>
	);
}
