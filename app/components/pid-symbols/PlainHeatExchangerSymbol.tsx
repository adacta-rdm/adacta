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

export function PlainHeatExchangerSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 52.92, 40]} bodySize={40}>
			<g className="pid-symbol-drawing">
				<path d="M20 0a20 20 0 1 0 0 39.997 20 20 0 1 0 0-40" />
				<path fill="none" d="M52.92 7.709H14.14l12.883 12.228-12.883 12.35h38.78" />

				{/* This surface-colored shape masks the part of the internal line hidden by the exchanger. */}
				<path
					fill="var(--adacta-color-diagram-surface)"
					stroke="none"
					d="m16.58 31.097 5.91-5.656c3.076-2.941 5.607-5.398 5.63-5.461s-2.628-2.648-5.888-5.747L16.303 8.6l9.512-.031c8.942-.033 9.525-.02 9.694.194.447.563 1.76 2.883 2.114 3.732 1.81 4.349 1.994 9.242.51 13.652-.428 1.267-1.447 3.322-2.238 4.516l-.496.747H16.26z"
				/>
			</g>
		</SymbolSvg>
	);
}

export function ConnectablePlainHeatExchangerSymbol({
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
			<PlainHeatExchangerSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePIDSymbol>
	);
}
