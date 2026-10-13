import { describe, expect, test } from "bun:test";

import type { InternalNode } from "@xyflow/react";

import {
	pidGridHandle,
	pidGridOriginOffset,
	snapPIDNodePosition,
} from "~/app/components/PIDGridOrigin.ts";
import type { PIDNode } from "~/app/lib/PIDEditorGraph.ts";

describe("P&ID grid origin", () => {
	test("uses a source handle for equipment and the center for symbols without an outlet", () => {
		expect(pidGridHandle("valve", 1)).toBe("outlet");
		expect(pidGridHandle("gas-bottle", 1)).toBe("outlet");
		expect(pidGridHandle("junction", 1)).toBe("outlet");
		expect(pidGridHandle("three-way-valve", 1)).toBe("outlet-left");
		expect(pidGridHandle("three-way-valve", 2)).toBe("inlet");
		expect(pidGridHandle("covered-gas-vent", 1)).toBeUndefined();
		expect(pidGridHandle("curved-gas-vent", 1)).toBeUndefined();
		expect(pidGridHandle("sample", 1)).toBeUndefined();
		expect(pidGridHandle("note", 1)).toBeUndefined();
	});

	test("snaps the measured handle center, including its inset", () => {
		const node = measuredNode("valve", 1, 32, 32, { x: 24, y: 12, width: 8, height: 8 });
		const offset = pidGridOriginOffset(node);

		expect(offset).toEqual({ x: 12, y: 0 });
		expect(snapPIDNodePosition({ x: 100, y: 101 }, { x: 0, y: 0 }, offset!)).toEqual({
			x: 98,
			y: 100,
		});
	});

	test("uses the rotated handle position and keeps the result on later loads", () => {
		const node = measuredNode("valve", 1, 32, 32, { x: 12, y: 0, width: 8, height: 8 });
		const offset = pidGridOriginOffset(node)!;
		const position = snapPIDNodePosition({ x: 101, y: 100 }, { x: 0, y: 0 }, offset);

		expect(position).toEqual({ x: 100, y: 102 });
		expect(snapPIDNodePosition(position, { x: 0, y: 0 }, offset)).toEqual(position);
	});

	test("snaps a contained symbol in canvas coordinates", () => {
		const node = measuredNode("three-way-valve", 1, 32, 32, {
			x: 8,
			y: 0,
			width: 8,
			height: 8,
		});
		const offset = pidGridOriginOffset(node)!;
		const position = snapPIDNodePosition({ x: 35, y: 45 }, { x: 104, y: 204 }, offset);

		expect(position).toEqual({ x: 40, y: 48 });
		expect(104 + position.x + offset.x).toBe(140);
		expect(204 + position.y + offset.y).toBe(240);
	});
});

function measuredNode(
	kind: PIDNode["data"]["kind"],
	inletCount: PIDNode["data"]["inletCount"],
	width: number,
	height: number,
	handle: { x: number; y: number; width: number; height: number },
): InternalNode<PIDNode> {
	return {
		data: { kind, inletCount },
		measured: { width, height },
		internals: { handleBounds: { source: [{ id: pidGridHandle(kind, inletCount), ...handle }] } },
	} as InternalNode<PIDNode>;
}
