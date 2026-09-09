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

export function RadialFanSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 40, 40]}>
			<g className="pid-symbol-drawing">
				<path d="M20 .603a19.395 19.396 0 1 0 0 38.793A19.395 19.396 0 1 0 20 .603" />
				<path
					fill="none"
					d="m12.499 38.067 26.238-13.544M12.5 1.87l26.238 13.544M7.688 15.99v8.092"
				/>

				<g className="pid-symbol-detail">
					<path d="M12.436 11.964a5.155 1.133 51.01 1 0 6.24 8.125 5.156 1.133 51.01 1 0-6.24-8.126" />
					<path d="M12.366 28.142a5.207 1.062-52 1 0 6.411-8.205 5.207 1.062-52 1 0-6.41 8.205" />
					<path d="M30.119 20.215a5.448 1.053.943 1 0-10.894-.18 5.448 1.053.943 1 0 10.894.18" />
				</g>
			</g>
		</SymbolSvg>
	);
}

export function ConnectableRadialFanSymbol({
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
			<RadialFanSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePIDSymbol>
	);
}
