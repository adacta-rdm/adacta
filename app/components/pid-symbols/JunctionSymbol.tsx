import { useEdges } from "@xyflow/react";

import { connectionDrawing, parallelLineSpacing } from "~/app/components/PIDEditorConnections.tsx";
import type { PIDEdgeKind } from "~/app/lib/PID.ts";
import type { PIDEdge } from "~/app/lib/PIDEditorGraph.ts";

import {
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
const center = 10;
const outer = 20 + HANDLE_OUTSIDE_REACH;
const armEnds = {
	inlet: [-HANDLE_OUTSIDE_REACH, center],
	"branch-inlet": [center, -HANDLE_OUTSIDE_REACH],
	outlet: [outer, center],
	branch: [center, outer],
} as const;

interface JunctionArm {
	portId: keyof typeof armEnds;
	kind: PIDEdgeKind;
	weight: number;
	outgoing: boolean;
}

/**
 * A junction marks a point where pipes meet.
 *
 * Each arm continues one connected line to the center. Its drawing uses the
 * line kind and weight recorded on that connection.
 */
export function JunctionSymbol({ connectedArms, ...props }: JunctionSymbolProps) {
	const unconnected = connectedArms?.length === 0;
	const preview = connectedArms === undefined || unconnected;

	return (
		<SymbolSvg {...props} viewBox={[0, 0, 20, 20]} bodySize={20}>
			{preview ? (
				<g className={unconnected ? "pid-symbol-drawing opacity-30" : "pid-symbol-drawing"}>
					<path d={junctionPath(portIds)} fill="none" />
				</g>
			) : (
				<g className="pid-symbol-drawing">
					{connectedArms.map((arm, index) => {
						const drawing = connectionDrawing(junctionArmPath(arm), arm.kind, arm.weight, false);

						return drawing.lines.map((line, lineIndex) => (
							<path
								key={`${index}-${lineIndex}`}
								d={line.path}
								fill="none"
								strokeDasharray={line.dashes}
								style={{ strokeWidth: arm.weight }}
							/>
						));
					})}
				</g>
			)}
		</SymbolSvg>
	);
}

interface JunctionSymbolProps extends PIDSymbolProps {
	connectedArms?: readonly JunctionArm[];
}

function junctionArmPath({ portId, kind, weight, outgoing }: JunctionArm): string {
	const [x, y] = armEnds[portId];
	const spacing = kind === "jacketed" || kind === "traced" ? parallelLineSpacing(kind, weight) : 0;
	const outsideX = x + Math.sign(x - center) * spacing;
	const outsideY = y + Math.sign(y - center) * spacing;

	// Parallel lines begin or end inside their route. Extend the route so they
	// reach the same place as the corresponding lines outside the junction.
	return outgoing
		? `M ${center} ${center} L ${outsideX} ${outsideY}`
		: `M ${outsideX} ${outsideY} L ${center} ${center}`;
}

/**
 * Returns one arm for each named port.
 */
export function junctionPath(connectedPortIds: readonly string[], outsideReach = 0): string {
	const connected = new Set(connectedPortIds);
	const nearEdge = -outsideReach;
	const farEdge = 20 + outsideReach;

	return [
		connected.has("inlet") ? `M ${nearEdge} 10 H 10` : "",
		connected.has("branch-inlet") ? `M 10 ${nearEdge} V 10` : "",
		connected.has("outlet") ? `M 10 10 H ${farEdge}` : "",
		connected.has("branch") ? `M 10 10 V ${farEdge}` : "",
	]
		.filter(Boolean)
		.join(" ");
}

type JunctionEdge = Pick<PIDEdge, "source" | "sourceHandle" | "target" | "targetHandle"> & {
	data?: { kind?: PIDEdgeKind; weight?: number };
};

/**
 * Returns the line kind and weight for each edge attached to a junction.
 */
export function junctionArmsForNode(edges: readonly JunctionEdge[], nodeId: string): JunctionArm[] {
	const connectedArms: JunctionArm[] = [];

	for (const edge of edges) {
		const outgoing = edge.source === nodeId;
		const portId = outgoing ? edge.sourceHandle : edge.targetHandle;
		if (!outgoing && edge.target !== nodeId) continue;
		if (portId === null || portId === undefined || !(portId in armEnds)) continue;

		connectedArms.push({
			portId: portId as JunctionArm["portId"],
			kind: edge.data?.kind ?? "pipe",
			weight: edge.data?.weight ?? 1,
			outgoing,
		});
	}

	return connectedArms;
}

export function ConnectableJunctionSymbol({
	nodeId,
	selected,
	orientation = 0,
	maximumSize,
	className,
}: ConnectablePIDSymbolProps) {
	const edges = useEdges<PIDEdge>();
	const connectedArms = junctionArmsForNode(edges, nodeId);

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
				connectedArms={connectedArms}
			/>
		</ConnectablePIDSymbol>
	);
}
