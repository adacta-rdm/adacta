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

export function DiaphragmValveSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 35.632, 15.457]}>
			<path
				fill="none"
				fillRule="evenodd"
				stroke="#000"
				strokeDasharray="none"
				strokeLinecap="butt"
				strokeLinejoin="miter"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth="1.06299"
				d="M18.154 43.184V29.011l34.569 14.173"
				transform="translate(-17.623 -28.218)"
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
				strokeWidth="1.06299"
				d="M52.723 43.184V29.011L18.154 43.184"
				transform="translate(-17.623 -28.218)"
			/>
			<path
				fill="#fff"
				fillOpacity="1"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth="1.0248"
				d="M35.432 19.52a4.43 1.772 0 0 1-4.467 1.74 4.43 1.772 0 0 1-4.39-1.772"
				transform="matrix(1.09636 0 0 -.98137 -16.18 24.994)"
			/>
			<path
				fill="#fff"
				fillOpacity="1"
				stroke="#fff"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeLinecap="square"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".134223"
				d="M18.805 36.094v-6.18l.41.17c.226.095 3.578 1.47 7.45 3.057 3.871 1.587 7.04 2.919 7.04 2.96s-2.203.975-4.894 2.077l-7.45 3.05-2.556 1.046zm15.089-1.269c-.834-.352-1.8-.677-2.147-.722l-.631-.083.452-.281c.837-.52 1.921-.725 3.84-.727 1.848-.001 2.757.147 3.651.597l.494.248-.683.231a42 42 0 0 0-2.06.808c-.756.317-1.381.575-1.388.572zm10.704 4.398c-4.113-1.68-7.479-3.084-7.48-3.119-.002-.078 14.927-6.197 14.983-6.141.023.022.026 2.802.008 6.178l-.033 6.137z"
				opacity="1"
				transform="translate(-17.623 -28.218)"
			/>
		</SymbolSvg>
	);
}

export function ConnectableDiaphragmValveSymbol({
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
			<DiaphragmValveSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePidSymbol>
	);
}
