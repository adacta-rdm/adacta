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

export function TrayColumnSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 18.671, 56]}>
			<g className="pid-symbol-drawing" fill="none">
				<path d="M18.124 47.371a8.793 7.999 0 0 1-8.868 7.857A8.793 7.999 0 0 1 .54 47.23" />
				<path d="M18.124 6.593A8.792 6.03 0 0 0 9.257.67 8.792 6.03 0 0 0 .54 6.7" />
				<path d="M.546 6.24v41.838M18.125 6.23v41.848" />

				<g className="pid-symbol-detail" strokeDasharray="2.75 2.75">
					<path d="M.266 9.88h18.173M.294 42.608H18.47M.203 37.112h18.175" />
					<path d="M.294 31.708H18.47M.294 26.212H18.47M.294 20.808H18.47M.203 15.312h18.175" />
				</g>

				{/* This shape keeps the tray lines inside the column outline. */}
				<path
					fill="var(--adacta-color-diagram-surface)"
					stroke="none"
					d="M7.531 54.458c-2.477-.537-4.53-2.027-5.585-4.056-.697-1.342-.766-1.737-.814-4.665L1.09 43.15h1.94v-1.008H1.108v-4.488H2.94v-1.007H1.108V32.25h1.923v-1.008H1.108v-4.488h1.923v-1.007H1.108v-4.398h1.923V20.34H1.108v-4.488H2.94v-1.007H1.108v-4.489h1.923V9.35H1.088l.041-1.718c.046-1.993.15-2.385.889-3.35.964-1.259 2.506-2.172 4.54-2.685 1.154-.29 3.121-.39 4.376-.218 2.898.393 5.29 1.828 6.22 3.73l.305.623.03 1.808.029 1.81h-.93v1.007h.917v4.489h-1.018l.028.48.027.482.482.027.48.027v4.48h-.925l.027.48.028.48.435.03.436.027v4.387h-.926l.027.48.028.482.435.027.436.028v4.478h-.926l.027.481.028.48.435.03.436.027v4.387h-1.018l.028.48.027.482.482.027.48.027v4.48h-.925l.027.48.028.48.435.03.436.027v2.406c0 1.331-.045 2.646-.1 2.948-.466 2.548-2.676 4.873-5.442 5.721a12 12 0 0 1-1.094.267c-.748.134-2.63.11-3.338-.044zm.979-11.835.027-.482h-2.85v.443c0 .245.03.472.064.507s.663.052 1.396.038l1.334-.025zm5.422.023v-.504h-2.749v1.008h2.75zm-5.514-5.52.028-.48h-2.85v.443c0 .244.028.472.063.507s.664.05 1.397.038l1.334-.026zm5.422.024v-.503h-2.746v1.007h2.748zm-5.33-5.427.027-.482h-2.85v.443c0 .245.03.472.064.507s.663.052 1.396.038l1.334-.025zm5.422.023v-.504h-2.749v1.008h2.75zm-5.422-5.52.027-.48h-2.85v.443c0 .244.03.472.064.507s.663.05 1.396.038l1.334-.026zm5.422.024v-.503h-2.749v1.007h2.75zM8.51 20.823l.027-.482h-2.85v.443c0 .245.03.472.064.507s.663.052 1.396.038l1.334-.025zm5.422.023v-.504h-2.749v1.008h2.75zm-5.514-5.52.028-.48h-2.85v.443c0 .244.028.472.063.507s.664.05 1.397.038l1.334-.026zm5.422.024v-.503h-2.746v1.007h2.748zM8.51 9.877l-.028-.48-1.397-.026-1.396-.025v1.012h2.848zm5.422-.025v-.506l-1.397.025-1.397.025-.028.481-.027.481h2.849z"
				/>
			</g>
		</SymbolSvg>
	);
}

export function ConnectableTrayColumnSymbol({
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
			<TrayColumnSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePIDSymbol>
	);
}
