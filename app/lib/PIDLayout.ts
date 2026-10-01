export interface PIDLayoutBox {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface PIDLayoutDelta {
	id: string;
	x: number;
	y: number;
}

export interface PIDNudgeNode {
	id: string;
	parentId?: string;
	position: { x: number; y: number };
	width?: number;
	height?: number;
}

export type PIDAlignment = "left" | "right" | "top" | "bottom";
export type PIDDistributionAxis = "horizontal" | "vertical";

export const PID_GRID_SIZE = 10;
export const PID_LAYOUT_CLEARANCE = 8;
const PID_LAYOUT_MOVEMENT_EPSILON = 0.001;
const PID_LAYOUT_ORDER_TIE_EPSILON = 1;

/**
 * Snaps a node's centre to the diagram grid.
 *
 * A contained node records its centre relative to its parent's top-left
 * corner. Pass that corner as `canvasOffset` to snap the visible centre in
 * canvas coordinates while keeping the stored position parent-relative.
 *
 * This custom snapper will hopefully become obsolete once React Flow supports
 * snapping node origins: https://github.com/xyflow/xyflow/pull/6015
 */
export function snapPIDPosition(
	position: { x: number; y: number },
	canvasOffset: { x: number; y: number } = { x: 0, y: 0 },
	grid = PID_GRID_SIZE,
): { x: number; y: number } {
	return {
		x: Math.round((position.x + canvasOffset.x) / grid) * grid - canvasOffset.x,
		y: Math.round((position.y + canvasOffset.y) / grid) * grid - canvasOffset.y,
	};
}

/** Reports whether a proposed layout would visibly move at least one box. */
export function hasPIDLayoutMovement(deltas: PIDLayoutDelta[]): boolean {
	return deltas.some(
		(delta) =>
			Math.abs(delta.x) > PID_LAYOUT_MOVEMENT_EPSILON ||
			Math.abs(delta.y) > PID_LAYOUT_MOVEMENT_EPSILON,
	);
}

/**
 * Returns one shared movement for the outermost selected nodes.
 *
 * A selected descendant follows its selected ancestor instead of moving a
 * second time. When a selected root sits inside another node, its measured
 * bounds constrain the shared movement so the whole selection keeps its
 * relative layout.
 */
export function nudgePIDNodes(
	nodes: readonly PIDNudgeNode[],
	selectedNodeIds: Iterable<string>,
	movement: { x: number; y: number },
): PIDLayoutDelta[] {
	const nodeById = new Map(nodes.map((node) => [node.id, node]));
	const selected = new Set([...selectedNodeIds].filter((nodeId) => nodeById.has(nodeId)));
	const roots = nodes.filter((node) => selected.has(node.id) && !hasSelectedAncestor(node));
	let x = movement.x;
	let y = movement.y;

	for (const node of roots) {
		if (node.parentId === undefined) continue;

		const parent = nodeById.get(node.parentId);
		if (!parent) continue;

		if (node.width !== undefined && parent.width !== undefined) {
			x = constrainedMovement(
				x,
				node.width / 2 - node.position.x,
				parent.width - node.width / 2 - node.position.x,
			);
		}

		if (node.height !== undefined && parent.height !== undefined) {
			y = constrainedMovement(
				y,
				node.height / 2 - node.position.y,
				parent.height - node.height / 2 - node.position.y,
			);
		}
	}

	return roots.map((node) => ({ id: node.id, x, y }));

	function hasSelectedAncestor(node: PIDNudgeNode): boolean {
		const visited = new Set<string>();
		let parentId = node.parentId;

		while (parentId !== undefined && !visited.has(parentId)) {
			if (selected.has(parentId)) return true;

			visited.add(parentId);
			parentId = nodeById.get(parentId)?.parentId;
		}

		return false;
	}
}

function constrainedMovement(movement: number, minimum: number, maximum: number): number {
	if (minimum > maximum) return 0;

	return Math.min(Math.max(movement, minimum), maximum);
}

/** Returns the movement that aligns the requested outer edge of every box. */
export function alignPIDBoxes(boxes: PIDLayoutBox[], alignment: PIDAlignment): PIDLayoutDelta[] {
	if (boxes.length < 2) return [];

	if (alignment === "left") {
		const target = Math.min(...boxes.map((box) => box.x));
		return snapLayoutDeltas(
			boxes,
			boxes.map((box) => ({ id: box.id, x: target - box.x, y: 0 })),
			"horizontal",
		);
	}

	if (alignment === "right") {
		const target = Math.max(...boxes.map((box) => box.x + box.width));
		return snapLayoutDeltas(
			boxes,
			boxes.map((box) => ({ id: box.id, x: target - box.x - box.width, y: 0 })),
			"horizontal",
		);
	}

	if (alignment === "top") {
		const target = Math.min(...boxes.map((box) => box.y));
		return snapLayoutDeltas(
			boxes,
			boxes.map((box) => ({ id: box.id, x: 0, y: target - box.y })),
			"vertical",
		);
	}

	const target = Math.max(...boxes.map((box) => box.y + box.height));
	return snapLayoutDeltas(
		boxes,
		boxes.map((box) => ({ id: box.id, x: 0, y: target - box.y - box.height })),
		"vertical",
	);
}

/**
 * Returns the movement that puts an equal visible gap between each box.
 *
 * The first and last box stay where they are when their span has room for the
 * minimum clearance. Otherwise, the boxes expand symmetrically around the
 * selection's current centre. Boxes tied on the distribution axis follow
 * their visual order on the perpendicular axis.
 */
export function distributePIDBoxes(
	boxes: PIDLayoutBox[],
	axis: PIDDistributionAxis,
	clearance = PID_LAYOUT_CLEARANCE,
): PIDLayoutDelta[] {
	if (boxes.length < 3) return [];

	const horizontal = axis === "horizontal";
	const ordered = boxes
		.map((box, index) => ({ box, index }))
		.sort((left, right) => {
			const leftPrimaryCenter = horizontal
				? left.box.x + left.box.width / 2
				: left.box.y + left.box.height / 2;
			const rightPrimaryCenter = horizontal
				? right.box.x + right.box.width / 2
				: right.box.y + right.box.height / 2;
			const leftSecondaryCenter = horizontal
				? left.box.y + left.box.height / 2
				: left.box.x + left.box.width / 2;
			const rightSecondaryCenter = horizontal
				? right.box.y + right.box.height / 2
				: right.box.x + right.box.width / 2;

			const primaryDifference = leftPrimaryCenter - rightPrimaryCenter;

			return (
				(Math.abs(primaryDifference) <= PID_LAYOUT_ORDER_TIE_EPSILON ? 0 : primaryDifference) ||
				leftSecondaryCenter - rightSecondaryCenter ||
				left.index - right.index
			);
		})
		.map(({ box }) => box);
	const first = ordered[0];
	const last = ordered.at(-1)!;
	const fixedStart = horizontal ? first.x : first.y;
	const end = horizontal ? last.x + last.width : last.y + last.height;
	const occupied = ordered.reduce((total, box) => total + (horizontal ? box.width : box.height), 0);
	const minimumSpan = occupied + clearance * (ordered.length - 1);
	const fixedSpan = end - fixedStart;
	const selectionStart = Math.min(...boxes.map((box) => (horizontal ? box.x : box.y)));
	const selectionEnd = Math.max(
		...boxes.map((box) => (horizontal ? box.x + box.width : box.y + box.height)),
	);
	const selectionCenter = (selectionStart + selectionEnd) / 2;
	const expandsSelection = fixedSpan < minimumSpan;
	const gap = expandsSelection ? clearance : (fixedSpan - occupied) / (ordered.length - 1);
	const start = expandsSelection ? selectionCenter - minimumSpan / 2 : fixedStart;
	let cursor = start;

	const deltas = ordered.map((box) => {
		const current = horizontal ? box.x : box.y;
		const delta = cursor - current;
		cursor += (horizontal ? box.width : box.height) + gap;

		return {
			id: box.id,
			x: horizontal ? delta : 0,
			y: horizontal ? 0 : delta,
		};
	});

	return snapLayoutDeltas(boxes, deltas, axis);
}

function snapLayoutDeltas(
	boxes: PIDLayoutBox[],
	deltas: PIDLayoutDelta[],
	axis: PIDDistributionAxis,
	grid = PID_GRID_SIZE,
): PIDLayoutDelta[] {
	const boxById = new Map(boxes.map((box) => [box.id, box]));
	const horizontal = axis === "horizontal";

	return deltas.map((delta) => {
		const box = boxById.get(delta.id);
		if (!box) return delta;

		// React Flow stores these positions at the node centre (`nodeOrigin` is
		// [0.5, 0.5]), so snap the resulting centre rather than the measured
		// top-left corner. Symbols with odd dimensions can consequently have a
		// fractional top-left while their model position remains grid-aligned.
		const current = horizontal ? box.x + box.width / 2 : box.y + box.height / 2;
		const movement = horizontal ? delta.x : delta.y;
		const snappedPosition = Math.round((current + movement) / grid) * grid;
		const snappedMovement = snappedPosition - current;

		return horizontal ? { ...delta, x: snappedMovement } : { ...delta, y: snappedMovement };
	});
}

/** Counts pairs that would overlap or sit closer than the requested clearance. */
export function countPIDLayoutCollisions(
	boxes: PIDLayoutBox[],
	deltas: PIDLayoutDelta[],
	clearance = PID_LAYOUT_CLEARANCE,
): number {
	const deltaById = new Map(deltas.map((delta) => [delta.id, delta]));
	const moved = boxes.map((box) => {
		const delta = deltaById.get(box.id);
		return {
			...box,
			x: box.x + (delta?.x ?? 0),
			y: box.y + (delta?.y ?? 0),
		};
	});
	let collisions = 0;

	for (let leftIndex = 0; leftIndex < moved.length; leftIndex++) {
		const left = moved[leftIndex];
		for (let rightIndex = leftIndex + 1; rightIndex < moved.length; rightIndex++) {
			const right = moved[rightIndex];
			const separated =
				left.x + left.width + clearance <= right.x ||
				right.x + right.width + clearance <= left.x ||
				left.y + left.height + clearance <= right.y ||
				right.y + right.height + clearance <= left.y;

			if (!separated) collisions++;
		}
	}

	return collisions;
}
