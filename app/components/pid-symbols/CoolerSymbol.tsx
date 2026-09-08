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

export function CoolerSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 36.876, 38.663]}>
			<g transform="translate(-21.732 -7.757)">
				<ellipse
					cx="36.295"
					cy="26.152"
					fill="red"
					fillOpacity="0"
					fillRule="evenodd"
					stroke="#000"
					strokeLinecap="butt"
					strokeLinejoin="miter"
					strokeOpacity="1"
					strokeWidth="1px"
					opacity="1"
					rx="14.063"
					ry="13.661"
				/>
				<path
					fill="none"
					fillRule="evenodd"
					stroke="#000"
					strokeLinecap="butt"
					strokeLinejoin="miter"
					strokeOpacity="1"
					strokeWidth="1px"
					d="m27.232 7.759-.178 38.66"
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
					strokeWidth="1.24016"
					d="M40.008 15.479h18.6M39.892 37.34h18.654M39.535 14.86v8.13"
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
					strokeWidth="1.26322"
					d="M38.934 22.395h6.55"
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
					strokeWidth="1.24016"
					d="M39.387 29.886v8.078"
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
					strokeWidth="1.43724"
					d="M38.761 30.009h7.016"
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
					strokeWidth="1.43712"
					d="M45.056 21.802v8.681"
				/>
			</g>
		</SymbolSvg>
	);
}

export function ConnectableCoolerSymbol({
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
			<CoolerSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePidSymbol>
	);
}
