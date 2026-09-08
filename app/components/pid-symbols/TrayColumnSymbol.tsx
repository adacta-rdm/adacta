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

export function TrayColumnSymbol(props: PidSymbolProps) {
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
				strokeDasharray="2.65748,2.65748"
				strokeDashoffset="0"
				strokeLinecap="butt"
				strokeLinejoin="miter"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".885827"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M26.575 17.27H44.29"
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
				strokeDasharray="2.65748,2.65748"
				strokeDashoffset="0"
				strokeLinecap="butt"
				strokeLinejoin="miter"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".885827"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M26.603 49.173h17.716"
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
				strokeDasharray="2.65748,2.65748"
				strokeDashoffset="0"
				strokeLinecap="butt"
				strokeLinejoin="miter"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".885827"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M26.514 43.816H44.23"
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
				strokeDasharray="2.65748,2.65748"
				strokeDashoffset="0"
				strokeLinecap="butt"
				strokeLinejoin="miter"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".885827"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M26.603 38.548h17.716"
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
				strokeDasharray="2.65748,2.65748"
				strokeDashoffset="0"
				strokeLinecap="butt"
				strokeLinejoin="miter"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".885827"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M26.603 33.191h17.716"
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
				strokeDasharray="2.65748,2.65748"
				strokeDashoffset="0"
				strokeLinecap="butt"
				strokeLinejoin="miter"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".885827"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M26.603 27.923h17.716"
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
				strokeDasharray="2.65748,2.65748"
				strokeDashoffset="0"
				strokeLinecap="butt"
				strokeLinejoin="miter"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".885827"
				markerEnd="none"
				markerMid="none"
				markerStart="none"
				d="M26.514 22.566H44.23"
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
				strokeDasharray=".237275,.237275"
				strokeDashoffset="0"
				strokeLinecap="square"
				strokeMiterlimit="4"
				strokeOpacity="1"
				strokeWidth=".0790917"
				d="M33.657 60.724c-2.415-.524-4.415-1.976-5.444-3.954-.68-1.308-.747-1.693-.794-4.547l-.04-2.522h1.892v-.982h-1.875v-4.375h1.786v-.982h-1.786v-4.286h1.875v-.982h-1.875v-4.375h1.875v-.982h-1.875V28.45h1.875v-.982h-1.875v-4.375h1.786v-.982h-1.786v-4.375h1.875v-.982h-1.894l.04-1.675c.044-1.942.146-2.324.866-3.265.94-1.227 2.443-2.117 4.426-2.617 1.124-.283 3.042-.38 4.265-.213 2.825.383 5.156 1.782 6.064 3.637l.296.606.029 1.763.029 1.764h-.906v.982h.893v4.375h-.992l.027.468.027.47.469.026.469.027v4.366h-.902l.026.469.027.468.424.028.425.027v4.276h-.902l.026.468.027.47.424.026.425.028v4.365h-.902l.026.469.027.468.424.028.425.027v4.276h-.992l.027.468.027.47.469.026.469.027v4.366h-.902l.026.469.027.468.424.028.425.027v2.345c0 1.298-.044 2.58-.097 2.874-.454 2.484-2.609 4.75-5.305 5.577-.295.09-.774.207-1.066.26-.729.13-2.564.107-3.254-.043zm.954-11.536.027-.47H31.86v.432c0 .238.028.46.062.494s.646.05 1.361.037l1.3-.025zm5.285.022v-.491h-2.679v.982h2.68zm-5.374-5.38.027-.468H31.77v.431c0 .238.028.46.062.494s.647.05 1.362.037l1.3-.025zm5.285.023v-.491H37.13v.982h2.679zm-5.196-5.29.027-.47H31.86v.432c0 .238.028.46.062.494s.646.05 1.361.037l1.3-.025zm5.285.022v-.491h-2.679v.982h2.68zm-5.285-5.38.027-.468H31.86v.431c0 .238.028.46.062.494s.646.05 1.361.037l1.3-.025zm5.285.023v-.491h-2.679v.982h2.68zm-5.285-5.29.027-.47H31.86v.432c0 .238.028.46.062.494s.646.05 1.361.037l1.3-.025zm5.285.022v-.491h-2.679v.982h2.68zm-5.374-5.38.027-.468H31.77v.431c0 .238.028.46.062.494s.647.05 1.362.037l1.3-.025zm5.285.023v-.491H37.13v.982h2.679zm-5.196-5.335-.027-.469-1.362-.024-1.361-.025v.987h2.777zm5.285-.025v-.493l-1.361.025-1.362.024-.027.469-.027.469h2.777z"
				opacity="1"
				transform="translate(-26.316 -7.64)"
			/>
		</SymbolSvg>
	);
}

export function ConnectableTrayColumnSymbol({
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
			<TrayColumnSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePidSymbol>
	);
}
