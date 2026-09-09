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

export function SpiralHeatExchangerSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 40, 40]}>
			<g className="pid-symbol-drawing">
				<path d="M20.206.633a19.016 19.26 0 1 0 0 38.519 19.016 19.26 0 1 0 0-38.519" />

				<g className="pid-symbol-detail">
					<path d="M20.206 3.784a15.564 16.11 0 1 0 0 32.22 15.564 16.11 0 1 0 0-32.22" />
					<path d="M20.205 6.834a12.719 13.06 0 1 0 0 26.119 12.719 13.06 0 1 0 0-26.119" />
					<path fill="none" d="M2.553 2.24 37.86 37.547m0-35.305L2.553 37.546" />
				</g>

				<path
					fill="none"
					d="m35.53.577 3.993 3.992m.066 30.584-4.124 4.123M.823 4.636 4.946.51m.413 39.178L.41 34.74"
				/>
			</g>
		</SymbolSvg>
	);
}

export function ConnectableSpiralHeatExchangerSymbol({
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
			<SpiralHeatExchangerSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePIDSymbol>
	);
}
