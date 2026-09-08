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

export function AutoclaveSymbol(props: PidSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 36.851, 54.105]}>
			<g transform="translate(-17.717 -9.004)">
				<path
					fill="none"
					fillOpacity="1"
					stroke="#000"
					strokeDasharray="none"
					strokeDashoffset="0"
					strokeMiterlimit="4"
					strokeOpacity="1"
					strokeWidth=".935248"
					d="M46.061 22.223a12.402 4.43 0 0 1-12.508 4.352 12.402 4.43 0 0 1-12.293-4.43"
					transform="matrix(1.15656 0 0 -1.15237 -2.789 54.057)"
				/>
				<path
					fill="none"
					fillOpacity="1"
					stroke="#000"
					strokeDasharray="none"
					strokeDashoffset="0"
					strokeMiterlimit="4"
					strokeOpacity="1"
					strokeWidth=".722701"
					d="M49.604 41.742a14.173 6.2 0 0 1-14.295 6.092 14.173 6.2 0 0 1-14.05-6.2"
					transform="matrix(1.26388 0 0 1.71174 -8.656 -19.39)"
				/>
				<path
					fill="none"
					fillOpacity="1"
					stroke="#000"
					strokeDasharray="none"
					strokeDashoffset="0"
					strokeMiterlimit="4"
					strokeOpacity="1"
					strokeWidth=".936128"
					d="M12.829 19.488a11.943 7.087 0 0 1-6.093 6.178 11.943 7.087 0 0 1-12.06-.125 11.943 7.087 0 0 1-5.726-6.3"
					transform="matrix(1.19945 -.02244 0 1.18102 35.08 27.435)"
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
					d="M21.791 27.986v22.86"
					color="#000"
					display="inline"
					overflow="visible"
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
					strokeWidth="1.04894"
					markerEnd="none"
					markerMid="none"
					markerStart="none"
					d="M50.491 28.155v22.352"
					color="#000"
					display="inline"
					overflow="visible"
					visibility="visible"
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
					strokeWidth="1.05554"
					d="M18.248 38.82v13.097"
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
					d="M54.011 38.115v14.434"
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
					strokeWidth=".793401"
					markerEnd="none"
					markerMid="none"
					markerStart="none"
					d="M35.92 16.342v33.601z"
					color="#000"
					display="inline"
					overflow="visible"
					visibility="visible"
				/>
				<path
					fill="#fff"
					fillOpacity="1"
					stroke="#000"
					strokeDasharray="none"
					strokeDashoffset="0"
					strokeMiterlimit="4"
					strokeOpacity="1"
					strokeWidth=".673443"
					d="M33.78 9.34h4.252v6.622H33.78z"
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
					strokeWidth=".442913"
					markerEnd="none"
					markerMid="none"
					markerStart="none"
					d="M32.776 10.63h6.2"
					color="#000"
					display="inline"
					overflow="visible"
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
					strokeWidth=".442913"
					markerEnd="none"
					markerMid="none"
					markerStart="none"
					d="M32.776 14.173h6.2"
					color="#000"
					display="inline"
					overflow="visible"
					visibility="visible"
				/>
				<ellipse
					cx="6.201"
					cy="14.616"
					fill="#fff"
					fillOpacity="1"
					stroke="#000"
					strokeDasharray="none"
					strokeDashoffset="0"
					strokeMiterlimit="4"
					strokeOpacity="1"
					strokeWidth="1.06299"
					rx="3.543"
					ry="1.329"
					transform="matrix(1.0356 0 0 .56161 25.801 41.174)"
				/>
				<ellipse
					cx="6.201"
					cy="14.616"
					fill="#fff"
					fillOpacity="1"
					stroke="#000"
					strokeDasharray="none"
					strokeDashoffset="0"
					strokeMiterlimit="4"
					strokeOpacity="1"
					strokeWidth="1.06299"
					rx="3.543"
					ry="1.329"
					transform="matrix(1.0356 0 0 .56161 33.123 41.174)"
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
					d="M34.612 58.184c-5.57-.2-10.496-2.577-11.807-5.7-.386-.92-.374-.566-.403-12.589-.032-13.174-.112-11.933.823-12.79 1.79-1.64 6.082-2.836 10.874-3.03l1.406-.056V48.59l-.246-.08c-1.224-.4-4.776-.375-6.23.043-1.135.326-1.23 1.197-.173 1.591 1.404.523 5.457.54 6.683.028.29-.12.366-.121.703-.001 1.05.372 3.589.497 5.35.262 1.637-.218 2.32-.666 1.99-1.306-.306-.59-1.64-.89-3.97-.893-1.31-.002-2.37.084-3.004.243l-.21.052V24.02l1.45.056c4.095.16 7.965 1.086 10.104 2.42.688.428 1.339 1.06 1.484 1.442.054.144.087 4.47.087 11.654 0 11.312-.002 11.431-.185 11.98-1.01 3.041-5.04 5.535-10.27 6.359-.829.13-3.245.328-3.608.294-.098-.009-.48-.027-.848-.04z"
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
					d="M30.217 49.544c-.38-.058-.713-.13-.74-.157-.11-.11 1.486-.266 2.719-.267 1.332-.001 2.897.165 2.674.284-.483.257-3.339.343-4.653.14z"
				/>
				<path
					fill="#fff"
					fillOpacity="1"
					fillRule="nonzero"
					stroke="#000"
					strokeDasharray="none"
					strokeDashoffset="0"
					strokeLinecap="square"
					strokeLinejoin="miter"
					strokeMiterlimit="4"
					strokeOpacity="1"
					strokeWidth=".890076"
					markerEnd="none"
					markerMid="none"
					markerStart="none"
					d="M18.162 38.713h3.25"
					color="#000"
					display="inline"
					overflow="visible"
					visibility="visible"
				/>
				<path
					fill="#fff"
					fillOpacity="1"
					fillRule="nonzero"
					stroke="#000"
					strokeDasharray="none"
					strokeDashoffset="0"
					strokeLinecap="square"
					strokeLinejoin="miter"
					strokeMiterlimit="4"
					strokeOpacity="1"
					strokeWidth=".884724"
					markerEnd="none"
					markerMid="none"
					markerStart="none"
					d="M54.125 37.991h-3.502"
					color="#000"
					display="inline"
					overflow="visible"
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
					strokeWidth=".047455"
					d="M34.456 61.895c-2.06-.148-3.668-.396-5.313-.82-3.303-.852-6.034-2.253-7.873-4.04-1.344-1.307-2.106-2.601-2.396-4.068-.093-.476-.09-.112-.077-7.396l.011-6.372h2.408l.016 6.06c.018 6.667.002 6.288.295 7.186 1.109 3.391 5.376 5.992 11.04 6.728 2.806.365 5.858.22 8.563-.404 3.299-.762 6.095-2.188 7.835-3.995 1.176-1.223 1.83-2.479 2.027-3.895.033-.235.049-2.302.049-6.393V38.44h2.41v7.07c0 7.71.012 7.322-.252 8.172-.141.452-.567 1.333-.843 1.744-1.487 2.214-4.141 4.005-7.677 5.18-1.854.617-3.658.992-5.804 1.207-.668.067-3.813.125-4.42.082z"
					opacity="1"
				/>
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
}: ConnectablePidSymbolProps) {
	return (
		<ConnectablePidSymbol
			nodeId={nodeId}
			selected={selected}
			orientation={orientation}
			ports={ports}
		>
			<AutoclaveSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePidSymbol>
	);
}
