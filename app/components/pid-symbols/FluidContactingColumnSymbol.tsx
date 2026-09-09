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

export function FluidContactingColumnSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 18.671, 56]}>
			<g className="pid-symbol-drawing" fill="none">
				<path d="M18.124 47.371a8.793 7.999 0 0 1-8.868 7.857A8.793 7.999 0 0 1 .54 47.23" />
				<path d="M18.124 6.593A8.792 6.03 0 0 0 9.257.67 8.792 6.03 0 0 0 .54 6.7" />
				<path d="M.546 6.24v41.838M18.125 6.23v41.848M.514 10.338h17.905M.503 43.29h17.905" />

				<g className="pid-symbol-detail">
					<path d="m.502 10.12 17.702 32.696M18.204 10.12.502 42.815" />
				</g>

				{/* This shape keeps the packing lines inside the column outline. */}
				<path
					fill="var(--adacta-color-diagram-surface)"
					stroke="none"
					d="M1.128 7.817c.034-1.709.06-1.955.247-2.434.678-1.729 2.6-3.133 5.183-3.785 1.154-.29 3.121-.39 4.376-.218 2.898.393 5.29 1.828 6.22 3.731l.305.622.028 1.992.031 1.992H1.088Zm4.235 10.438-3.942-7.302 3.965-.023a787 787 0 0 1 7.934 0l3.967.023-3.944 7.302c-2.17 4.016-3.965 7.302-3.991 7.3-.025 0-1.82-3.284-3.989-7.3m-4.25 8.231c-.003-7.878.012-14.31.033-14.288s1.77 3.24 3.89 7.155l3.852 7.117-3.76 6.943-3.888 7.172c-.105.195-.125-1.958-.128-14.099m12.525 7.038-3.82-7.058 3.82-7.055 3.82-7.055.024 7.06c.012 3.885.012 10.236 0 14.114l-.023 7.05zM1.15 42.53c.11-.29 8.156-15.133 8.202-15.133.084 0 8.153 14.984 8.153 15.14 0 .143-.59.154-8.208.154-7.78 0-8.205-.009-8.147-.16m6.381 11.927c-2.477-.537-4.53-2.027-5.585-4.056-.67-1.29-.763-1.778-.813-4.299l-.046-2.22h16.419v2.044c0 1.124-.045 2.288-.1 2.587-.466 2.548-2.676 4.873-5.442 5.721a12 12 0 0 1-1.094.267c-.748.134-2.63.11-3.338-.044z"
				/>
			</g>
		</SymbolSvg>
	);
}

export function ConnectableFluidContactingColumnSymbol({
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
			<FluidContactingColumnSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePIDSymbol>
	);
}
