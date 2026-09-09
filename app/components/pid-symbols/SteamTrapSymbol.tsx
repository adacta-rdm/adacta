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

export function SteamTrapSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 40, 40]}>
			<g className="pid-symbol-drawing">
				<path
					fill="currentColor"
					d="M34.764 7.583a19.334 19.142-39.976 0 1-2.73 26.843 19.334 19.142-39.976 0 1-26.906-2.007"
				/>
				<path d="M34.855 7.56a19.334 19.142-39.976 0 0-26.91-1.97 19.334 19.142-39.976 0 0-2.696 26.844" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectableSteamTrapSymbol({
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
			<SteamTrapSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePIDSymbol>
	);
}
