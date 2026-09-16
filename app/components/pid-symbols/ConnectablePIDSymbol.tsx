import { Handle, Position, useConnection } from "@xyflow/react";
import type { ReactNode } from "react";

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
}

interface PIDSymbolWithPortsProps {
	nodeId: string;
	selected: boolean;
	orientation?: PIDOrientation;
	ports: readonly PIDPort[];

	/**
	 * The smallest area, in pixels, that may be grabbed to move the symbol.
	 *
	 * A connection point covers about eight pixels and sits on the outline of
	 * the symbol. A symbol drawn smaller than about thirty pixels is therefore
	 * almost completely covered by its own connection points, and a drag that
	 * starts on one of them draws a line instead of moving the symbol. Giving
	 * such a symbol an invisible square around it leaves room to take hold of
	 * it. A symbol already larger than the square keeps its own size.
	 */
	minimumGrabSize?: number;

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
	minimumGrabSize,
	children,
}: PIDSymbolWithPortsProps) {
	const connection = useConnection();
	const rotatedPorts = ports.map((port) => rotatePort(port, orientation));
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

			{rotatedPorts.map((port) => (
				<Handle
					key={port.id}
					id={port.id}
					type={port.type}
					position={handlePositions[port.side]}
					style={handleOffset(port)}
					className={handleClassName({
						connectionInProgress: connection.inProgress,
						compatible:
							connection.inProgress &&
							connection.fromNode.id !== nodeId &&
							connection.fromHandle.type !== port.type,
					})}
				/>
			))}
		</div>
	);
}

function rotatePort(port: PIDPort, orientation: PIDOrientation): PIDPort {
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

function clockwiseSide(side: PIDPortSide): PIDPortSide {
	const sides: readonly PIDPortSide[] = ["top", "right", "bottom", "left"];

	return sides[(sides.indexOf(side) + 1) % sides.length];
}

function handleClassName({
	connectionInProgress,
	compatible,
}: {
	connectionInProgress: boolean;
	compatible: boolean;
}) {
	const appearance = "!size-2 !border !border-accent !bg-surface transition-opacity";

	if (connectionInProgress) {
		return compatible
			? `${appearance} !pointer-events-auto !border-success !opacity-100`
			: `${appearance} !pointer-events-none !border-border-strong !opacity-100`;
	}

	return `${appearance} !pointer-events-none !opacity-0 group-hover/pid-node:!pointer-events-auto group-hover/pid-node:!opacity-100`;
}

const handlePositions: Record<PIDPortSide, Position> = {
	top: Position.Top,
	right: Position.Right,
	bottom: Position.Bottom,
	left: Position.Left,
};

/**
 * Places one connection point on the symbol.
 *
 * React Flow ends a connection at the edge of the point that faces away from
 * the symbol, rather than at its middle. A point centred on the outline would
 * therefore hold the line half its own width clear of the drawing. Each point
 * is placed just inside the outline instead, so its outward edge falls on the
 * outline and the line meets the symbol.
 */
function handleOffset(port: PIDPort) {
	// React Flow centres a point on the outline with a transform. Removing the
	// half step on the axis that leaves the symbol moves the point inside,
	// which is what puts its outward edge on the outline. The half step across
	// that axis stays, because it is what centres the point on its side.
	switch (port.side) {
		case "top":
			return { top: 0, left: `${port.x * 100}%`, transform: "translate(-50%, 0)" };
		case "bottom":
			return { bottom: 0, left: `${port.x * 100}%`, transform: "translate(-50%, 0)" };
		case "left":
			return { left: 0, top: `${port.y * 100}%`, transform: "translate(0, -50%)" };
		case "right":
			return { right: 0, top: `${port.y * 100}%`, transform: "translate(0, -50%)" };
	}
}
