import {
	ConnectablePIDSymbol,
	type ConnectablePIDSymbolProps,
	type PIDPort,
} from "./ConnectablePIDSymbol.tsx";
import { SymbolSvg, type PIDSymbolProps } from "./SymbolSvg.tsx";

const ports = [
	{ id: "inlet", type: "target", side: "left", x: 0, y: 0.5 },
	{ id: "branch-inlet", type: "target", side: "top", x: 0.5, y: 0 },
	{ id: "outlet", type: "source", side: "right", x: 1, y: 0.5 },
	{ id: "branch", type: "source", side: "bottom", x: 0.5, y: 1 },
] satisfies readonly PIDPort[];

/**
 * A point where pipes meet, drawn as a small filled dot.
 *
 * A junction carries no equipment. It exists so that a line can divide or two
 * lines can join at a stated place. For example, a dilution line joining the
 * main feed meets it at a junction.
 *
 * The dot is drawn because an editor needs something to select and drag. A
 * pipe that merely crosses another is not a junction, and shows the break that
 * every connection draws behind itself.
 */
export function JunctionSymbol(props: PIDSymbolProps) {
	return (
		<SymbolSvg {...props} viewBox={[0, 0, 10, 10]} bodySize={10}>
			<g className="pid-symbol-drawing">
				<circle cx="5" cy="5" r="2.5" fill="currentColor" stroke="none" />
			</g>
		</SymbolSvg>
	);
}

export function ConnectableJunctionSymbol({
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
			<JunctionSymbol orientation={orientation} maximumSize={maximumSize} className={className} />
		</ConnectablePIDSymbol>
	);
}
