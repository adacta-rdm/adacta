import { ConnectablePIDSymbol, type ConnectablePIDSymbolProps } from "./ConnectablePIDSymbol.tsx";
import { SymbolSvg, type PIDSymbolProps } from "./SymbolSvg.tsx";

/**
 * A remark written on the diagram.
 *
 * A note carries no equipment and joins nothing. It records something the
 * symbols cannot say, for example that a bypass is opened by hand during
 * start-up.
 *
 * This drawing stands for a note in the palette. On the diagram the note is
 * drawn as its own text, so that the words are readable at the size they are
 * written in.
 */
export function NoteSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 28, 20]} bodySize={28}>
			<g className="pid-symbol-drawing" fill="none">
				<path d="M2 4h24M2 10h24M2 16h14" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectableNoteSymbol({
	nodeId,
	selected,
	orientation = 0,
	maximumSize,
	className,
}: ConnectablePIDSymbolProps) {
	return (
		<ConnectablePIDSymbol nodeId={nodeId} selected={selected} orientation={orientation} ports={[]}>
			<NoteSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePIDSymbol>
	);
}
