import { useNodeConnections } from "@xyflow/react";

import {
	connectedPIDPortIds,
	ConnectablePIDSymbol,
	type ConnectablePIDSymbolProps,
	type PIDPort,
} from "./ConnectablePIDSymbol.tsx";
import { SymbolSvg, type PIDSymbolProps } from "./SymbolSvg.tsx";

const ports = [
	{ id: "inlet", type: "source", side: "left", x: 0, y: 0.5 },
	{ id: "branch-inlet", type: "source", side: "top", x: 0.5, y: 0 },
	{ id: "outlet", type: "source", side: "right", x: 1, y: 0.5 },
	{ id: "branch", type: "source", side: "bottom", x: 0.5, y: 1 },
] satisfies readonly PIDPort[];

const HANDLE_OUTSIDE_REACH = 4;
const portIds = ports.map((port) => port.id);

/**
 * A junction marks a point where pipes meet.
 *
 * Each arm continues one connected pipe to the center. A pipe crossing
 * without a junction has a visible break instead.
 */
export function JunctionSymbol({ connectedPortIds, ...props }: JunctionSymbolProps) {
	const unconnected = connectedPortIds?.length === 0;
	const path = junctionPath(
		unconnected ? portIds : (connectedPortIds ?? portIds),
		connectedPortIds === undefined || unconnected ? 0 : HANDLE_OUTSIDE_REACH,
	);

	return (
		<SymbolSvg {...props} viewBox={[0, 0, 10, 10]} bodySize={10}>
			{path ? (
				<g className={unconnected ? "pid-symbol-drawing opacity-30" : "pid-symbol-drawing"}>
					<path d={path} fill="none" />
				</g>
			) : null}
		</SymbolSvg>
	);
}

interface JunctionSymbolProps extends PIDSymbolProps {
	connectedPortIds?: readonly string[];
}

/** Returns one arm for each connected port. */
export function junctionPath(connectedPortIds: readonly string[], outsideReach = 0): string {
	const connected = new Set(connectedPortIds);
	const nearEdge = -outsideReach;
	const farEdge = 10 + outsideReach;

	return [
		connected.has("inlet") ? `M ${nearEdge} 5 H 5` : "",
		connected.has("branch-inlet") ? `M 5 ${nearEdge} V 5` : "",
		connected.has("outlet") ? `M 5 5 H ${farEdge}` : "",
		connected.has("branch") ? `M 5 5 V ${farEdge}` : "",
	]
		.filter(Boolean)
		.join(" ");
}

export function ConnectableJunctionSymbol({
	nodeId,
	selected,
	orientation = 0,
	maximumSize,
	className,
}: ConnectablePIDSymbolProps) {
	const connections = useNodeConnections({ id: nodeId });
	const connectedPortIds = [...connectedPIDPortIds(connections, nodeId)];

	return (
		<ConnectablePIDSymbol
			nodeId={nodeId}
			selected={selected}
			orientation={orientation}
			ports={ports}
			bidirectionalHandles
			minimumGrabSize={36}
			handlesCenteredOnEdge
		>
			<JunctionSymbol
				orientation={orientation}
				maximumSize={maximumSize}
				className={className}
				connectedPortIds={connectedPortIds}
			/>
		</ConnectablePIDSymbol>
	);
}
