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

export function FluidContactingColumnSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 18.2, 54.587]}>
			<path
				fill="none"
				fillOpacity="1"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".854321"
				d="M37.203 13.365a9.744 4.43 0 0 1-9.827 4.351 9.744 4.43 0 0 1-9.66-4.429"
				transform="matrix(.8796 0 0 1.76006 -15.057 22.653)"
			/>
			<path
				fill="none"
				fillOpacity="1"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".983966"
				d="M37.203 13.365a9.744 4.43 0 0 1-9.827 4.351 9.744 4.43 0 0 1-9.66-4.429"
				transform="matrix(.87954 0 0 -1.32692 -15.055 24.161)"
			/>
			<path
				fill="#fff"
				fillOpacity="1"
				fillRule="nonzero"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeLinecap="butt"
				strokeLinejoin="miter"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth="1.06299"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M26.848 13.722v40.783"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-26.316 -7.64)"
				visibility="visible"
			/>
			<path
				fill="#fff"
				fillOpacity="1"
				fillRule="nonzero"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeLinecap="butt"
				strokeLinejoin="miter"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth="1.06299"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M43.984 13.713v40.792"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-26.316 -7.64)"
				visibility="visible"
			/>
			<path
				fill="#fff"
				fillOpacity="1"
				fillRule="nonzero"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeLinecap="butt"
				strokeLinejoin="miter"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth="1.06299"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M26.817 17.717H44.27"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-26.316 -7.64)"
				visibility="visible"
			/>
			<path
				fill="#fff"
				fillOpacity="1"
				fillRule="nonzero"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeLinecap="butt"
				strokeLinejoin="miter"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth="1.06299"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M26.806 49.838H44.26"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-26.316 -7.64)"
				visibility="visible"
			/>
			<path
				fill="#fff"
				fillOpacity="1"
				fillRule="nonzero"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeLinecap="butt"
				strokeLinejoin="miter"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".708661"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="m26.805 17.504 17.256 31.872"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-26.316 -7.64)"
				visibility="visible"
			/>
			<path
				fill="#fff"
				fillOpacity="1"
				fillRule="nonzero"
				stroke="#000"
				strokeDasharray="none"
				strokeDashoffset="0"
				strokeLinecap="butt"
				strokeLinejoin="miter"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".708661"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M44.061 17.504 26.805 49.376"
				color="#000"
				display="inline"
				overflow="visible"
				transform="translate(-26.316 -7.64)"
				visibility="visible"
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
				strokeWidth=".09491"
				d="M27.416 15.26c.033-1.666.058-1.906.24-2.373.661-1.685 2.535-3.054 5.053-3.689 1.124-.283 3.042-.38 4.265-.213 2.825.383 5.156 1.782 6.064 3.637l.296.606.028 1.942.03 1.942H27.377Zm4.128 10.174-3.843-7.117 3.865-.023a767 767 0 0 1 7.734 0l3.867.023-3.845 7.117c-2.115 3.915-3.865 7.118-3.89 7.117-.024 0-1.774-3.202-3.888-7.117zM27.4 33.458c-.002-7.68.013-13.949.033-13.928s1.726 3.159 3.792 6.975l3.755 6.937-3.666 6.768-3.789 6.991c-.103.19-.122-1.909-.125-13.743zm12.21 6.86-3.724-6.88 3.724-6.877 3.724-6.877.023 6.883c.012 3.786.012 9.977 0 13.757l-.023 6.873zm-12.173 8.78c.108-.282 7.95-14.751 7.995-14.751.082 0 7.947 14.606 7.947 14.758 0 .139-.574.15-8.001.15-7.583 0-7.998-.009-7.941-.157zm6.22 11.626c-2.415-.524-4.415-1.976-5.444-3.954-.654-1.258-.744-1.733-.793-4.19l-.044-2.165H43.38v1.993c0 1.096-.044 2.23-.097 2.522-.454 2.484-2.609 4.75-5.305 5.577-.295.09-.774.207-1.066.26-.729.13-2.564.107-3.254-.043z"
				opacity="1"
				transform="translate(-26.316 -7.64)"
			/>
		</SymbolSvg>
	);
}

export function ConnectableFluidContactingColumnSymbol({
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
			<FluidContactingColumnSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePidSymbol>
	);
}
