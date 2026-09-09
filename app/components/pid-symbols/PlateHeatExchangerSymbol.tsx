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

export function PlateHeatExchangerSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 38.188, 40.938]} bodySize={40}>
			<g className="pid-symbol-drawing" fill="none">
				<path d="M3.73.47h30.625v40H3.73z" />

				<g className="pid-symbol-detail">
					<path d="M6.542.156v40.626M25.321.213V40.84M22.171.213V40.84M19.1.056v40.626" />
					<path d="M15.793.135V40.76M12.722.135V40.76M9.572.135V40.76M31.543.093V40.72M28.47.093V40.72" />
					<path d="M3.541 3.37H.313l-.08-.08M34.41 3.29h3.465M34.489 37.624h3.307M3.777 37.545H.312" />
					<path d="M.312 1.715v3.15m37.484-3.15.08 3.15M37.796 36.128V39.2M.312 36.128V39.2" />
					<path d="M3.777 3.29 34.41 37.624M34.332 3.211 3.699 37.545" />
				</g>
			</g>
		</SymbolSvg>
	);
}

export function ConnectablePlateHeatExchangerSymbol({
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
			<PlateHeatExchangerSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePIDSymbol>
	);
}
