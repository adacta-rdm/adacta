import type { InternalNode, XYPosition } from "@xyflow/react";

import type { PIDSymbolKind } from "~/app/components/PIDSymbol.tsx";
import type { PIDInletCount } from "~/app/lib/PID.ts";
import type { PIDNode } from "~/app/lib/PIDEditorGraph.ts";
import { snapPIDPosition } from "~/app/lib/PIDLayout.ts";

/**
 * Returns the handle used to place a symbol on the grid.
 * A vent has only an inlet. Notes and samples have no connection handles.
 */
export function pidGridHandle(kind: PIDSymbolKind, inletCount: PIDInletCount): string | undefined {
	if (kind === "note" || kind === "sample") return undefined;
	if (kind === "covered-gas-vent" || kind === "curved-gas-vent") return undefined;
	if (kind === "three-way-valve") return inletCount === 1 ? "outlet-left" : "inlet";

	return "outlet";
}

/** Returns the reference point relative to the measured center of a symbol. */
export function pidGridOriginOffset(node: InternalNode<PIDNode>): XYPosition | undefined {
	const width = node.measured.width;
	const height = node.measured.height;
	if (width === undefined || height === undefined) return undefined;

	const handleId = pidGridHandle(node.data.kind, node.data.inletCount);
	if (handleId === undefined) return { x: 0, y: 0 };

	const handle = node.internals.handleBounds?.source?.find(
		(candidate) => candidate.id === handleId,
	);
	if (!handle) return undefined;

	return {
		x: handle.x + handle.width / 2 - width / 2,
		y: handle.y + handle.height / 2 - height / 2,
	};
}

/**
 * Snaps the reference point in canvas coordinates.
 * A contained symbol stores its center relative to its parent's top-left corner.
 */
export function snapPIDNodePosition(
	position: XYPosition,
	canvasOffset: XYPosition,
	originOffset: XYPosition,
): XYPosition {
	const snappedOrigin = snapPIDPosition(
		{ x: position.x + originOffset.x, y: position.y + originOffset.y },
		canvasOffset,
	);

	return { x: snappedOrigin.x - originOffset.x, y: snappedOrigin.y - originOffset.y };
}
