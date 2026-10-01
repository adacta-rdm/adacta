import {
	Handle,
	Position,
	type NodeConnection,
	useConnection,
	useNodeConnections,
} from "@xyflow/react";
import { createContext, Fragment, useContext, type CSSProperties, type ReactNode } from "react";

import type { PIDInletCount } from "~/app/lib/PID.ts";

import type { PIDOrientation, PIDSymbolProps } from "./SymbolSvg.tsx";

export type PIDPortSide = "top" | "right" | "bottom" | "left";

export interface PIDPort {
	id: string;
	type: "source" | "target";
	side: PIDPortSide;
	x: number;
	y: number;
}

export interface ConnectablePIDSymbolProps extends PIDSymbolProps {
	nodeId: string;
	selected: boolean;
	inletCount?: PIDInletCount;
}

export const PIDHandleVisibilityContext = createContext({ visible: false, interactive: false });

interface PIDSymbolWithPortsProps {
	nodeId: string;
	selected: boolean;
	orientation?: PIDOrientation;
	ports: readonly PIDPort[];
	/** Allows every handle to receive and initiate a connection. */
	bidirectionalHandles?: boolean;

	/**
	 * The smallest area, in pixels, that may be grabbed to move the symbol.
	 *
	 * A connection point covers about eight pixels and sits on the outline of
	 * the symbol. A symbol drawn smaller than about thirty pixels is therefore
	 * almost completely covered by its own connection points, and a drag that
	 * starts on one of them draws a line instead of moving the symbol. An
	 * invisible square provides an exposed drag area. A symbol larger than the
	 * square keeps its own size.
	 */
	minimumGrabSize?: number;

	/** Centers each handle on the symbol boundary. */
	handlesCenteredOnEdge?: boolean;

	children: ReactNode;
}

/**
 * Adds the diagram editor's connection handles around a plain P&ID symbol.
 */
export function ConnectablePIDSymbol({
	nodeId,
	selected,
	orientation = 0,
	ports,
	bidirectionalHandles = false,
	minimumGrabSize,
	handlesCenteredOnEdge = false,
	children,
}: PIDSymbolWithPortsProps) {
	const connection = useConnection();
	const connections = useNodeConnections({ id: nodeId });
	const handleVisibility = useContext(PIDHandleVisibilityContext);
	const rotatedPorts = ports.map((port) => rotatePIDPort(port, orientation));
	const connectedPortIds = connectedPIDPortIds(connections, nodeId);
	const showSelection = selected && !connection.inProgress;

	return (
		<div
			className={
				showSelection ? "pid-symbol-selected relative inline-flex" : "relative inline-flex"
			}
		>
			{minimumGrabSize === undefined ? null : (
				<span
					aria-hidden="true"
					className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
					style={{
						width: `max(100%, ${minimumGrabSize}px)`,
						height: `max(100%, ${minimumGrabSize}px)`,
					}}
				/>
			)}

			{children}

			{rotatedPorts.map((port) => {
				const state = {
					connectionInProgress: connection.inProgress,
					alwaysShowHandles: handleVisibility.visible,
					interactiveHandles: handleVisibility.interactive,
					compatible:
						connection.inProgress &&
						connection.fromNode.id !== nodeId &&
						(bidirectionalHandles || connection.fromHandle.type !== port.type),
				};

				return (
					<Fragment key={port.id}>
						<Handle
							id={port.id}
							type={port.type}
							position={handlePositions[port.side]}
							style={pidHandleOffset(port, handlesCenteredOnEdge)}
							className={handleClassName(state)}
						/>

						{connectedPortIds.has(port.id) ? null : (
							<PIDHandleMarker
								port={port}
								bidirectional={bidirectionalHandles}
								className={markerClassName(state)}
							/>
						)}
					</Fragment>
				);
			})}
		</div>
	);
}

export function rotatePIDPort(port: PIDPort, orientation: PIDOrientation): PIDPort {
	let rotated = port;

	for (let turn = 0; turn < orientation; turn++) {
		rotated = {
			...rotated,
			side: clockwiseSide(rotated.side),
			x: 1 - rotated.y,
			y: rotated.x,
		};
	}

	return rotated;
}

type PIDNodeConnection = Pick<
	NodeConnection,
	"source" | "sourceHandle" | "target" | "targetHandle"
>;

/** Collects every handle on a node that is referenced by an edge endpoint. */
export function connectedPIDPortIds(
	connections: readonly PIDNodeConnection[],
	nodeId: string,
): Set<string> {
	const connected = new Set<string>();

	for (const connection of connections) {
		if (connection.source === nodeId && connection.sourceHandle !== null) {
			connected.add(connection.sourceHandle);
		}
		if (connection.target === nodeId && connection.targetHandle !== null) {
			connected.add(connection.targetHandle);
		}
	}

	return connected;
}

export interface PIDHandleMarkerDescription {
	kind: "single" | "bidirectional";
	rotation: number;
}

/** Describes a right-facing marker after accounting for the port's side and type. */
export function pidHandleMarker(
	port: Pick<PIDPort, "side" | "type">,
	bidirectional: boolean,
): PIDHandleMarkerDescription {
	const outwardRotation: Record<PIDPortSide, number> = {
		top: 270,
		right: 0,
		bottom: 90,
		left: 180,
	};
	const directionReversal = !bidirectional && port.type === "target" ? 180 : 0;

	return {
		kind: bidirectional ? "bidirectional" : "single",
		rotation: (outwardRotation[port.side] + directionReversal) % 360,
	};
}

function PIDHandleMarker({
	port,
	bidirectional,
	className,
}: {
	port: PIDPort;
	bidirectional: boolean;
	className: string;
}) {
	const marker = pidHandleMarker(port, bidirectional);

	return (
		<svg
			aria-hidden="true"
			className={className}
			viewBox="0 0 12 12"
			style={pidHandleMarkerOffset(port, marker.rotation)}
		>
			<path d="M 2 6 H 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
			<path
				d="M 7 3 L 10 6 L 7 9"
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.5"
			/>
			{marker.kind === "bidirectional" ? (
				<path
					d="M 5 3 L 2 6 L 5 9"
					fill="none"
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
			) : null}
		</svg>
	);
}

function pidHandleMarkerOffset(port: PIDPort, rotation: number): CSSProperties {
	const rotationTransform = `rotate(${rotation}deg)`;

	switch (port.side) {
		case "top":
			return {
				top: percentage(port.y),
				left: percentage(port.x),
				transform: `translate(-50%, calc(-50% - 12px)) ${rotationTransform}`,
			};
		case "bottom":
			return {
				bottom: percentage(1 - port.y),
				left: percentage(port.x),
				transform: `translate(-50%, calc(50% + 12px)) ${rotationTransform}`,
			};
		case "left":
			return {
				left: percentage(port.x),
				top: percentage(port.y),
				transform: `translate(calc(-50% - 12px), -50%) ${rotationTransform}`,
			};
		case "right":
			return {
				right: percentage(1 - port.x),
				top: percentage(port.y),
				transform: `translate(calc(50% + 12px), -50%) ${rotationTransform}`,
			};
	}
}

function clockwiseSide(side: PIDPortSide): PIDPortSide {
	const sides: readonly PIDPortSide[] = ["top", "right", "bottom", "left"];

	return sides[(sides.indexOf(side) + 1) % sides.length];
}

function handleClassName({
	connectionInProgress,
	alwaysShowHandles,
	interactiveHandles,
	compatible,
}: {
	connectionInProgress: boolean;
	alwaysShowHandles: boolean;
	interactiveHandles: boolean;
	compatible: boolean;
}) {
	const appearance = "!size-2 !border !bg-surface transition-opacity";
	const visibility = handleVisibilityClassName({
		connectionInProgress,
		alwaysShowHandles,
	});

	if (connectionInProgress) {
		return compatible
			? `${appearance} ${visibility} !pointer-events-auto !border-success`
			: `${appearance} ${visibility} !pointer-events-none !border-border-strong`;
	}

	if (alwaysShowHandles) {
		return `${appearance} ${visibility} ${interactiveHandles ? "!pointer-events-auto" : "!pointer-events-none"} !border-accent`;
	}

	return `${appearance} ${visibility} !pointer-events-none !border-accent group-hover/pid-node:!pointer-events-auto`;
}

function markerClassName(state: Parameters<typeof handleClassName>[0]) {
	const visibility = handleVisibilityClassName(state);
	const color = state.connectionInProgress
		? state.compatible
			? "text-success"
			: "text-border-strong"
		: "text-accent";

	return `pid-handle-marker pointer-events-none absolute size-3 overflow-visible transition-opacity ${visibility} ${color}`;
}

function handleVisibilityClassName({
	connectionInProgress,
	alwaysShowHandles,
}: Pick<Parameters<typeof handleClassName>[0], "connectionInProgress" | "alwaysShowHandles">) {
	if (connectionInProgress || alwaysShowHandles) return "!opacity-100";

	return "!opacity-0 group-hover/pid-node:!opacity-100";
}

const handlePositions: Record<PIDPortSide, Position> = {
	top: Position.Top,
	right: Position.Right,
	bottom: Position.Bottom,
	left: Position.Left,
};

/**
 * Places one connection point on the symbol at its drawing coordinates.
 *
 * React Flow ends a connection at the outer edge of the point. A point
 * centered on the outline would leave half its width between the line and the
 * drawing. Moving the point inside aligns its outer edge with the drawing. A
 * drawing may be narrower than its node bounds, so both coordinates determine
 * the offset even though `side` still tells React Flow how to route the line.
 */
export function pidHandleOffset(port: PIDPort, centeredOnEdge: boolean) {
	if (centeredOnEdge) {
		switch (port.side) {
			case "top":
				return {
					top: percentage(port.y),
					left: percentage(port.x),
					transform: "translate(-50%, -50%)",
				};
			case "bottom":
				return {
					bottom: percentage(1 - port.y),
					left: percentage(port.x),
					transform: "translate(-50%, 50%)",
				};
			case "left":
				return {
					left: percentage(port.x),
					top: percentage(port.y),
					transform: "translate(-50%, -50%)",
				};
			case "right":
				return {
					right: percentage(1 - port.x),
					top: percentage(port.y),
					transform: "translate(50%, -50%)",
				};
		}
	}

	// React Flow centers a point on the outline with a transform. Removing the
	// outward translation moves the point inside. The perpendicular translation
	// keeps the point centered on its side.
	switch (port.side) {
		case "top":
			return {
				top: percentage(port.y),
				left: percentage(port.x),
				transform: "translate(-50%, 0)",
			};
		case "bottom":
			return {
				bottom: percentage(1 - port.y),
				left: percentage(port.x),
				transform: "translate(-50%, 0)",
			};
		case "left":
			return {
				left: percentage(port.x),
				top: percentage(port.y),
				transform: "translate(0, -50%)",
			};
		case "right":
			return {
				right: percentage(1 - port.x),
				top: percentage(port.y),
				transform: "translate(0, -50%)",
			};
	}
}

function percentage(value: number): number | string {
	return value === 0 ? 0 : `${value * 100}%`;
}
