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

export function PressurizedVesselVerticalSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 29.449, 56]}>
			<g className="pid-symbol-drawing" fill="none">
				{/* An opaque body keeps process lines outside the vessel interior. */}
				<path
					fill="var(--adacta-color-diagram-surface)"
					stroke="none"
					d="M12.698 54.718c-3.69-.426-6.292-1.254-8.472-2.695-1.056-.699-2.273-2.031-2.661-2.914-.391-.887-.377-.041-.378-22.06V6.091l.24-.483c1.064-2.135 4.969-3.775 10.35-4.349 1.411-.15 4.874-.121 6.354.052 5.052.59 8.87 2.249 9.89 4.297l.24.483v20.956c-.002 23 .042 21.255-.559 22.382-1.315 2.468-4.91 4.398-9.525 5.116-.963.148-4.667.266-5.479.172"
				/>

				<path d="M28.885 47.487a14.162 8.042 0 0 1-14.282 7.898 14.162 8.042 0 0 1-14.04-8.04" />
				<path d="M28.884 6.487A14.16 6.063 0 0 0 14.603.533 14.16 6.063 0 0 0 .564 6.594" />
				<path d="M.572 6.13v42.066M28.887 6.122v42.074" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectablePressurizedVesselVerticalSymbol({
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
			<PressurizedVesselVerticalSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePIDSymbol>
	);
}
