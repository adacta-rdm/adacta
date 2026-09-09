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

export function DoublePipeHeatExchangerSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 44.924, 34.004]} bodySize={40}>
			<g className="pid-symbol-drawing">
				<path d="M4.379 4.662h30.677v6.548H4.379z" />
				<path d="M4.255 23.097h30.772v6.5H4.255z" />
				<path
					fill="none"
					d="M35.522 8.013a8.887 9.218 0 0 1 8.733 9.298 8.887 9.218 0 0 1-8.89 9.138"
				/>

				<g className="pid-symbol-detail" fill="none">
					<path d="m31.7 11.486.094 11.534" />
					<path d="M4.66 8.072h30.49M34.962 26.434h-30.3" />
					<path d="M7.737 4.566V.689M4.475 8.072H.465M4.475 26.434H.465" />
					<path d="M.372 6.135v3.69M.372 24.497v3.783" />
					<path d="M5.872 33.632h3.73M5.746.372H9.47M7.608 33.884v-3.723" />
				</g>

				{/* This shape masks the part of the inner line hidden by the return bend. */}
				<path
					fill="var(--adacta-color-diagram-surface)"
					stroke="none"
					d="M35.637 24.16v-1.703h-3.468l-.025-5.3-.025-5.302h3.518V8.637l.683.058c1.219.103 2.686.684 3.774 1.495 1.757 1.31 2.914 3.113 3.35 5.223.263 1.274.2 3.085-.15 4.256-.744 2.49-2.33 4.366-4.575 5.408a8.2 8.2 0 0 1-2.543.722l-.54.063z"
				/>
			</g>
		</SymbolSvg>
	);
}

export function ConnectableDoublePipeHeatExchangerSymbol({
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
			<DoublePipeHeatExchangerSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePIDSymbol>
	);
}
