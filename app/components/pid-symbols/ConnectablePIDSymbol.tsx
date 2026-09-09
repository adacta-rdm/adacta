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
	children,
}: PIDSymbolWithPortsProps) {
	const connection = useConnection();
	const rotatedPorts = ports.map((port) => rotatePort(port, orientation));
	const showSelection = selected && !connection.inProgress;

	return (
		<div
			className={showSelection ? "relative inline-flex ring-2 ring-focus" : "relative inline-flex"}
		>
			{children}

			{rotatedPorts.map((port) => (
				<Handle
					key={port.id}
					id={port.id}
					type={port.type}
					position={handlePositions[port.side]}
					style={handleOffset(port)}
					className={handleClassName({
						selected,
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
	selected,
	connectionInProgress,
	compatible,
}: {
	selected: boolean;
	connectionInProgress: boolean;
	compatible: boolean;
}) {
	const appearance = "!size-2.5 !border-2 !border-surface !bg-accent transition-opacity";

	if (connectionInProgress) {
		return compatible
			? `${appearance} !pointer-events-auto !bg-success !opacity-100`
			: `${appearance} !pointer-events-none !bg-border-strong !opacity-100`;
	}

	return selected
		? `${appearance} !pointer-events-auto !opacity-100`
		: `${appearance} !pointer-events-none !opacity-0 group-hover/pid-node:!pointer-events-auto group-hover/pid-node:!opacity-100`;
}

const handlePositions: Record<PIDPortSide, Position> = {
	top: Position.Top,
	right: Position.Right,
	bottom: Position.Bottom,
	left: Position.Left,
};

function handleOffset(port: PIDPort) {
	return port.side === "top" || port.side === "bottom"
		? { left: `${port.x * 100}%` }
		: { top: `${port.y * 100}%` };
}
