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

export function PressurizedVesselHorizontalSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 56, 30.058]}>
			<g className="pid-symbol-drawing" fill="none">
				{/* An opaque body keeps process lines outside the vessel interior. */}
				<path
					fill="var(--adacta-color-diagram-surface)"
					stroke="none"
					d="M6.473 28.798c-2.49-.693-4.514-4.85-5.163-10.603-.163-1.446-.162-4.94.001-6.347.602-5.168 2.212-8.92 4.398-10.251.739-.45-1.21-.416 22.66-.397l21.595.017.431.232c1.421.765 2.723 2.964 3.547 5.99.316 1.155.574 2.585.784 4.343.12.994.12 5.362.002 6.445-.555 5.067-2.084 8.907-4.074 10.227-.722.479 1.262.44-22.446.433-16.95-.005-21.498-.023-21.735-.09"
				/>

				<path d="M49.442 29.469a6.5 14.438 0 0 0 5.628-7.22 6.5 14.438 0 0 0 0-14.438A6.5 14.438 0 0 0 49.442.592" />
				<path d="M49.442.592H7.058M49.442 29.469H7.058" />
				<path d="M7.058 29.469a6.5 14.438 0 0 1-5.628-7.22 6.5 14.438 0 0 1 0-14.438A6.5 14.438 0 0 1 7.058.592" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectablePressurizedVesselHorizontalSymbol({
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
			<PressurizedVesselHorizontalSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePIDSymbol>
	);
}
