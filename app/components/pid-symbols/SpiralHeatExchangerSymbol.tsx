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

export function SpiralHeatExchangerSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 40.21, 40.413]}>
			<g transform="translate(-14.687 -15.767)">
				<ellipse
					cx="-35.63"
					cy="60.866"
					fill="#fff"
					fillOpacity="1"
					stroke="#000"
					strokeDasharray="none"
					strokeMiterlimit="4"
					strokeOpacity="1"
					strokeWidth=".659048"
					rx="14.37"
					ry="10"
					transform="matrix(1.33696 0 0 1.94583 82.636 -82.57)"
				/>
				<circle
					cx="38.976"
					cy="38.976"
					r="14.173"
					fill="#fff"
					fillOpacity="1"
					stroke="#000"
					strokeDasharray="none"
					strokeMiterlimit="4"
					strokeOpacity="1"
					strokeWidth=".941719"
					transform="matrix(1.1095 0 0 1.14839 -8.244 -8.894)"
				/>
				<circle
					cx="40.748"
					cy="44.291"
					r="8.858"
					fill="#fff"
					fillOpacity="1"
					stroke="#000"
					strokeDasharray="none"
					strokeMiterlimit="4"
					strokeOpacity="1"
					strokeWidth=".723164"
					transform="matrix(1.4506 0 0 1.4895 -24.11 -30.105)"
				/>
				<path
					fill="none"
					fillRule="evenodd"
					stroke="#000"
					strokeDasharray="none"
					strokeLinecap="butt"
					strokeLinejoin="miter"
					strokeMiterlimit="4"
					strokeOpacity="1"
					strokeWidth=".885827"
					d="m17.165 18.031 35.67 35.67m0-35.67-35.67 35.67"
				/>
				<path
					fill="none"
					fillRule="evenodd"
					stroke="#000"
					strokeDasharray="none"
					strokeLinecap="butt"
					strokeLinejoin="miter"
					strokeMiterlimit="4"
					strokeOpacity="1"
					strokeWidth=".966145"
					d="m50.483 16.35 4.034 4.033"
				/>
				<path
					fill="none"
					fillRule="evenodd"
					stroke="#000"
					strokeDasharray="none"
					strokeLinecap="butt"
					strokeLinejoin="miter"
					strokeMiterlimit="4"
					strokeOpacity="1"
					strokeWidth=".885827"
					d="m54.583 51.283-4.166 4.166m-35-34.999 4.166-4.167M20 55.866l-5-5"
				/>
			</g>
		</SymbolSvg>
	);
}

export function ConnectableSpiralHeatExchangerSymbol({
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
			<SpiralHeatExchangerSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePidSymbol>
	);
}
