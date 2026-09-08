import {
	ConnectablePidSymbol,
	type ConnectablePidSymbolProps,
	type PidPort,
} from "./ConnectablePidSymbol.tsx";
import { SymbolSvg, type PidSymbolProps } from "./SymbolSvg.tsx";

const ports = [
	{ id: "inlet", type: "target", side: "left", x: 0, y: 0.5 },
	{ id: "outlet", type: "source", side: "right", x: 1, y: 0.5 },
] satisfies readonly PidPort[];

export function ViewingGlassSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 33.009, 19.119]}>
			<g transform="translate(-20.555 -27.782)">
				<path
					fill="#fff"
					fillOpacity="1"
					stroke="#000"
					strokeDasharray="none"
					strokeDashoffset="0"
					strokeMiterlimit="4"
					strokeOpacity="1"
					strokeWidth="1.06299"
					d="M21.087 28.313h31.946v18.056H21.087z"
				/>
				<ellipse
					cx="37.944"
					cy="36.584"
					fill="#fff"
					fillOpacity="1"
					stroke="#000"
					strokeDasharray="none"
					strokeDashoffset="0"
					strokeMiterlimit="4"
					strokeOpacity="1"
					strokeWidth=".941013"
					rx="8.018"
					ry="7.26"
					transform="matrix(1.04008 0 0 1.22687 -2.279 -7.606)"
				/>
			</g>
		</SymbolSvg>
	);
}

export function ConnectableViewingGlassSymbol({
	nodeId,
	selected,
	orientation = 0,
	maximumSize,
	className,
}: ConnectablePidSymbolProps) {
	return (
		<ConnectablePidSymbol
			nodeId={nodeId}
			selected={selected}
			orientation={orientation}
			ports={ports}
		>
			<ViewingGlassSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePidSymbol>
	);
}
