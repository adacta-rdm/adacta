import { ConnectablePIDSymbol, type ConnectablePIDSymbolProps } from "./ConnectablePIDSymbol.tsx";
import { SymbolSvg, type PIDSymbolProps } from "./SymbolSvg.tsx";

/**
 * Material under test, drawn as a flask.
 *
 * A sample sits inside the device that holds it, for example the catalyst bed
 * inside a reactor. It joins nothing, because the pipework runs to the device
 * rather than to the material within it.
 */
export function SampleSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 24, 24]} bodySize={24}>
			<g className="pid-symbol-drawing" fill="none">
				<path d="M9.5 2v7.2a3 3 0 0 1-.6 1.8L4 18.5A2 2 0 0 0 5.7 21.6h12.6A2 2 0 0 0 20 18.5l-4.9-7.5a3 3 0 0 1-.6-1.8V2M8 2h8" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectableSampleSymbol({
	nodeId,
	selected,
	orientation = 0,
	maximumSize,
	className,
}: ConnectablePIDSymbolProps) {
	return (
		<ConnectablePIDSymbol nodeId={nodeId} selected={selected} orientation={orientation} ports={[]}>
			<SampleSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePIDSymbol>
	);
}
