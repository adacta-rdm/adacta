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

export function StraightTubeHeatExchangerSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 40.941, 19.046]} bodySize={40}>
			<g className="pid-symbol-drawing">
				<path d="M.47.471h40v18.105h-40z" />
				<path fill="none" d="M4.78.719V18.88M36 .668l.084 18.105" />

				<g className="pid-symbol-detail" fill="none">
					<path d="m5.175 3.28 30.828.079M4.78 6.362h31.302M4.938 9.523h30.906" />
					<path d="m5.018 12.607 30.985.078M4.702 15.847h31.221" />
				</g>
			</g>
		</SymbolSvg>
	);
}

export function ConnectableStraightTubeHeatExchangerSymbol({
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
			<StraightTubeHeatExchangerSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePIDSymbol>
	);
}
