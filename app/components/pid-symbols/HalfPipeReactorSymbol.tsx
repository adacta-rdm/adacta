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

const vesselBody =
	"M16.95 53.813c-6.096-.22-11.486-2.82-12.92-6.237-.422-1.007-.41-.62-.441-13.775-.035-14.415-.123-13.057.9-13.995 1.96-1.794 6.655-3.103 11.899-3.315l1.538-.062v26.886l-.269-.088c-1.34-.437-5.226-.41-6.817.047-1.242.357-1.346 1.31-.19 1.741 1.537.573 5.972.591 7.313.031.318-.131.4-.132.77-.001 1.149.407 3.927.544 5.854.287 1.79-.239 2.538-.73 2.177-1.43-.335-.645-1.794-.973-4.344-.977-1.433-.002-2.593.092-3.287.266l-.23.057V16.43l1.587.062c4.48.175 8.715 1.188 11.056 2.648.753.468 1.465 1.16 1.624 1.578.059.157.095 4.89.095 12.751 0 12.378-.002 12.508-.203 13.109-1.105 3.327-5.514 6.056-11.237 6.958-.907.142-3.55.359-3.948.322-.107-.01-.525-.03-.928-.044z";

export function HalfPipeReactorSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 37.287, 56]}>
			<g className="pid-symbol-drawing" fill="none">
				{/* The jacket curves sit behind the opaque reactor body. */}
				<g fill="var(--adacta-color-diagram-surface)">
					<path d="M35.212 28.518a1.652 1.554 0 0 1 1.451.768 1.652 1.554 0 0 1 0 1.566 1.652 1.554 0 0 1-1.451.768" />
					<path d="M35.204 39.363a1.652 1.554 0 0 1 1.452.768 1.652 1.554 0 0 1 0 1.566 1.652 1.554 0 0 1-1.452.768" />
					<path d="M35.204 33.941a1.652 1.554 0 0 1 1.452.768 1.652 1.554 0 0 1 0 1.566 1.652 1.554 0 0 1-1.452.768" />
					<path d="M2.096 28.518a1.652 1.554 0 0 1-1.452.768 1.652 1.554 0 0 1 0 1.566 1.652 1.554 0 0 1 1.452.768" />
					<path d="M2.076 39.417a1.652 1.554 0 0 1-1.451.769 1.652 1.554 0 0 1 0 1.565 1.652 1.554 0 0 1 1.451.768" />
					<path d="M2.076 33.996a1.652 1.554 0 0 1-1.451.768 1.652 1.554 0 0 1 0 1.566 1.652 1.554 0 0 1 1.451.768" />
					<path d="M6.224 52.178a1.514 1.441 0 0 1-1.466.486 1.514 1.441 0 0 1-1.144-.998 1.514 1.441 0 0 1 .38-1.434" />
					<path d="M12.002 54.346a1.514 1.441 0 0 1-1.144 1.225 1.514 1.441 0 0 1-1.609-.588 1.514 1.441 0 0 1 .011-1.639" />
					<path d="M25.24 54.29a1.441 1.514 90 0 0 1.144 1.226 1.441 1.514 90 0 0 1.609-.587 1.441 1.514 90 0 0-.011-1.64" />
					<path d="M30.664 51.93a1.441 1.514 90 0 0 1.457.623 1.441 1.514 90 0 0 1.232-.968 1.441 1.514 90 0 0-.363-1.48" />
				</g>

				<path fill="var(--adacta-color-diagram-surface)" stroke="none" d={vesselBody} />

				<path d="M34.316 21.275a15.695 5.586 0 0 0-15.83-5.487A15.695 5.586 0 0 0 2.93 21.374" />
				<path d="M34.296 44.877a15.679 9.156-1.627 0 1-7.678 8.18 15.679 9.156-1.627 0 1-15.752.375 15.679 9.156-1.627 0 1-7.916-7.81" />
				<path d="M2.92 20.77v25.013M34.324 20.955v24.458" />

				<g className="pid-symbol-detail">
					<path d="M18.38 8.03v36.765" />
					<path fill="var(--adacta-color-diagram-surface)" d="M16.039.368h4.652v7.245H16.04z" />
					<path d="M14.94 1.78h6.784M14.94 5.656h6.784" />
					<path d="M14.335 43.365a4.015.817 0 1 0 0 1.634 4.015.817 0 1 0 0-1.634" />
					<path d="M22.347 43.365a4.015.817 0 1 0 0 1.634 4.015.817 0 1 0 0-1.634" />
				</g>
			</g>
		</SymbolSvg>
	);
}

export function ConnectableHalfPipeReactorSymbol({
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
			<HalfPipeReactorSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
			/>
		</ConnectablePIDSymbol>
	);
}
