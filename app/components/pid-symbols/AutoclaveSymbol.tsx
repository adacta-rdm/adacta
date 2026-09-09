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

export function AutoclaveSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 36.851, 54.105]}>
			<g className="pid-symbol-drawing" fill="none">
				<path d="M32.766 19.444A14.344 5.105 0 0 0 18.3 14.429a14.344 5.105 0 0 0-14.218 5.105" />
				<path d="M36.32 43.057a17.913 10.613 0 0 1-18.067 10.428A17.913 10.613 0 0 1 .496 42.873" />
				<path d="M32.75 41.159a14.329 8.368-1.627 0 1-7.308 7.433 14.329 8.368-1.627 0 1-14.465.123 14.329 8.368-1.627 0 1-6.868-7.312" />
				<path d="M4.074 18.982v22.86" />
				<path d="M32.774 19.151v22.352" />
				<path d="M.531 29.816v13.097" />
				<path d="M36.294 29.111v14.434" />
				<path d="M.445 29.709h3.25" />
				<path d="M36.408 28.987h-3.502" />

				<g className="pid-symbol-detail">
					<path d="M18.203 7.338v33.601" />
					<path d="M16.063.336h4.252v6.622h-4.252z" />
					<path d="M15.059 1.626h6.2" />
					<path d="M15.059 5.169h6.2" />
					<path d="M14.506 39.632a3.67.746 0 1 0 0 1.493 3.67.746 0 1 0 0-1.493" />
					<path d="M21.828 39.632a3.67.746 0 1 0 0 1.493 3.67.746 0 1 0 0-1.493" />
				</g>
			</g>
		</SymbolSvg>
	);
}

export function ConnectableAutoclaveSymbol({
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
			<AutoclaveSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePIDSymbol>
	);
}
