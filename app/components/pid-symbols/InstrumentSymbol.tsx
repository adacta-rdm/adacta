import {
	ConnectablePIDSymbol,
	type ConnectablePIDSymbolProps,
	type PIDPort,
} from "./ConnectablePIDSymbol.tsx";
import { SymbolSvg, type PIDSymbolProps } from "./SymbolSvg.tsx";

const ports = [
	{ id: "inlet", type: "target", side: "left", x: 0, y: 0.5 },
	{ id: "outlet", type: "source", side: "right", x: 1, y: 0.5 },

	/*
		A device that only measures is joined to the pipe by a caption line. That
		line reaches the circle from below, so it needs a port of its own rather
		than the inlet the process uses.
	*/
	{ id: "leader", type: "target", side: "bottom", x: 0.5, y: 1 },
] satisfies readonly PIDPort[];

/**
 * A measuring or controlling device, drawn as a circle.
 *
 * The circle holds two lines of text. What the device does goes above, and what
 * it is called goes below. For example, a mass flow controller on the hydrogen
 * line reads "MFC" above "H2". The text is placed by the diagram rather than by
 * this drawing, so that it stays readable at any size.
 *
 * A device that sits in the pipe is connected through the two ports. A device
 * that only measures is joined to the pipe by a caption line instead.
 */
export function InstrumentSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 40, 40]} bodySize={40}>
			<g className="pid-symbol-drawing" fill="none">
				<circle cx="20" cy="20" r="19" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectableInstrumentSymbol({
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
			<InstrumentSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePIDSymbol>
	);
}
