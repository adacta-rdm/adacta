import { describe, expect, test } from "bun:test";

import {
	alignPIDBoxes,
	countPIDLayoutCollisions,
	distributePIDBoxes,
	hasPIDLayoutMovement,
	nudgePIDNodes,
	snapPIDPosition,
	type PIDLayoutBox,
} from "~/app/lib/PIDLayout.ts";

const boxes = [
	{ id: "a", x: 10, y: 20, width: 10, height: 20 },
	{ id: "b", x: 40, y: 50, width: 20, height: 10 },
	{ id: "c", x: 90, y: 100, width: 10, height: 30 },
] satisfies PIDLayoutBox[];

describe("P&ID grid snapping", () => {
	test("snaps stored root positions by node centre", () => {
		expect(snapPIDPosition({ x: 1256, y: 260 })).toEqual({ x: 1260, y: 260 });
		expect(snapPIDPosition({ x: 1306, y: 266 })).toEqual({ x: 1310, y: 270 });
	});

	test("snaps a contained node by its visible canvas centre", () => {
		expect(snapPIDPosition({ x: 35, y: 45 }, { x: 104, y: 204 })).toEqual({
			x: 36,
			y: 46,
		});
	});
});

describe("P&ID box alignment", () => {
	test("aligns differently sized boxes while snapping their centres", () => {
		expect(alignPIDBoxes(boxes, "left")).toEqual([
			{ id: "a", x: 5, y: 0 },
			{ id: "b", x: -30, y: 0 },
			{ id: "c", x: -75, y: 0 },
		]);
		expect(alignPIDBoxes(boxes, "right")).toEqual([
			{ id: "a", x: 85, y: 0 },
			{ id: "b", x: 40, y: 0 },
			{ id: "c", x: 5, y: 0 },
		]);
		expect(alignPIDBoxes(boxes, "top")).toEqual([
			{ id: "a", x: 0, y: 0 },
			{ id: "b", x: 0, y: -25 },
			{ id: "c", x: 0, y: -75 },
		]);
		expect(alignPIDBoxes(boxes, "bottom")).toEqual([
			{ id: "a", x: 0, y: 90 },
			{ id: "b", x: 0, y: 75 },
			{ id: "c", x: 0, y: 5 },
		]);
	});

	test("does nothing with fewer than two boxes", () => {
		expect(alignPIDBoxes(boxes.slice(0, 1), "left")).toEqual([]);
	});

	test("snaps the aligned edge to the grid", () => {
		const fractional = [
			{ id: "a", x: 13, y: 0, width: 20, height: 20 },
			{ id: "b", x: 47, y: 30, width: 20, height: 20 },
		];

		expect(alignPIDBoxes(fractional, "left")).toEqual([
			{ id: "a", x: -3, y: 0 },
			{ id: "b", x: -37, y: 0 },
		]);
	});

	test.each(["left", "right", "top", "bottom", "handles-vertical", "handles-horizontal"] as const)(
		"snaps %s alignment by each symbol's handle offset",
		(alignment) => {
			const selected = [
				{
					id: "a",
					x: 2,
					y: -2,
					width: 32,
					height: 32,
					gridOriginOffset: { x: 12, y: 6 },
				},
				{
					id: "b",
					x: 40,
					y: 40,
					width: 20,
					height: 20,
					gridOriginOffset: { x: 0, y: 0 },
				},
			];

			const deltas = alignPIDBoxes(selected, alignment);

			const expected = {
				left: [
					{ id: "a", x: 0, y: 0 },
					{ id: "b", x: -40, y: 0 },
				],
				right: [
					{ id: "a", x: 30, y: 0 },
					{ id: "b", x: 0, y: 0 },
				],
				top: [
					{ id: "a", x: 0, y: 0 },
					{ id: "b", x: 0, y: -40 },
				],
				bottom: [
					{ id: "a", x: 0, y: 30 },
					{ id: "b", x: 0, y: 0 },
				],
				"handles-vertical": [
					{ id: "a", x: 10, y: 0 },
					{ id: "b", x: -10, y: 0 },
				],
				"handles-horizontal": [
					{ id: "a", x: 0, y: 20 },
					{ id: "b", x: 0, y: -10 },
				],
			};
			const moved = selected.map((box, index) => ({
				...box,
				x: box.x + deltas[index].x,
				y: box.y + deltas[index].y,
			}));
			const axis = ["left", "right", "handles-vertical"].includes(alignment) ? "x" : "y";

			expect(deltas).toEqual(expected[alignment]);
			for (const box of moved) {
				const reference =
					axis === "x"
						? box.x + box.width / 2 + box.gridOriginOffset.x
						: box.y + box.height / 2 + box.gridOriginOffset.y;
				expect(reference % 10).toBe(0);
			}
		},
	);

	test("aligns reference handles on a vertical line", () => {
		const selected = [
			{ id: "a", x: 0, y: 0, width: 20, height: 20, gridOriginOffset: { x: 10, y: 0 } },
			{ id: "b", x: 40, y: 40, width: 20, height: 20, gridOriginOffset: { x: 0, y: 0 } },
		];

		const deltas = alignPIDBoxes(selected, "handles-vertical");

		expect(deltas).toEqual([
			{ id: "a", x: 20, y: 0 },
			{ id: "b", x: -10, y: 0 },
		]);
	});

	test("aligns reference handles on a horizontal line", () => {
		const selected = [
			{ id: "a", x: 0, y: 0, width: 20, height: 20, gridOriginOffset: { x: 0, y: 10 } },
			{ id: "b", x: 40, y: 40, width: 20, height: 20, gridOriginOffset: { x: 0, y: 0 } },
		];

		const deltas = alignPIDBoxes(selected, "handles-horizontal");

		expect(deltas).toEqual([
			{ id: "a", x: 0, y: 20 },
			{ id: "b", x: 0, y: -10 },
		]);
	});

	test("leaves reference handles on the same line in place", () => {
		const selected = [
			{ id: "a", x: 0, y: 0, width: 20, height: 20, gridOriginOffset: { x: 10, y: 0 } },
			{ id: "b", x: 10, y: 40, width: 20, height: 20, gridOriginOffset: { x: 0, y: 0 } },
		];

		const deltas = alignPIDBoxes(selected, "handles-vertical");

		expect(hasPIDLayoutMovement(deltas)).toBe(false);
	});
});

describe("P&ID box distribution", () => {
	test("distributes differently sized boxes with equal horizontal gaps", () => {
		expect(distributePIDBoxes(boxes, "horizontal")).toEqual([
			{ id: "a", x: 5, y: 0 },
			{ id: "b", x: 10, y: 0 },
			{ id: "c", x: 5, y: 0 },
		]);
	});

	test("distributes differently sized boxes with equal vertical gaps", () => {
		expect(distributePIDBoxes(boxes, "vertical")).toEqual([
			{ id: "a", x: 0, y: 0 },
			{ id: "b", x: 0, y: 15 },
			{ id: "c", x: 0, y: 5 },
		]);
	});

	test("expands symmetrically with minimum clearance when the outer span is too small", () => {
		const overlapping = [
			{ id: "a", x: 0, y: 0, width: 30, height: 10 },
			{ id: "b", x: 15, y: 0, width: 30, height: 10 },
			{ id: "c", x: 20, y: 0, width: 30, height: 10 },
		];

		expect(distributePIDBoxes(overlapping, "horizontal")).toEqual([
			{ id: "a", x: -25, y: 0 },
			{ id: "b", x: 0, y: 0 },
			{ id: "c", x: 25, y: 0 },
		]);
	});

	test("distributes an aligned row vertically in left-to-right order", () => {
		const row = [
			{ id: "c", x: 80, y: 0.25, width: 20, height: 20 },
			{ id: "a", x: 0, y: 0, width: 20, height: 20 },
			{ id: "b", x: 40, y: -0.25, width: 20, height: 20 },
		];

		expect(distributePIDBoxes(row, "vertical")).toEqual([
			{ id: "a", x: 0, y: -30 },
			{ id: "b", x: 0, y: 0.25 },
			{ id: "c", x: 0, y: 29.75 },
		]);
	});

	test("does nothing with fewer than three boxes", () => {
		expect(distributePIDBoxes(boxes.slice(0, 2), "vertical")).toEqual([]);
	});
});

describe("P&ID layout collision detection", () => {
	test("distinguishes an unsafe alignment from a safe one", () => {
		const row = [
			{ id: "a", x: 0, y: 0, width: 20, height: 20 },
			{ id: "b", x: 40, y: 0, width: 20, height: 20 },
		];

		expect(countPIDLayoutCollisions(row, alignPIDBoxes(row, "left"))).toBe(1);
		expect(countPIDLayoutCollisions(row, alignPIDBoxes(row, "top"))).toBe(0);
	});

	test("counts collisions after applying layout movement", () => {
		const separated = [
			{ id: "a", x: 0, y: 0, width: 20, height: 20 },
			{ id: "b", x: 40, y: 40, width: 20, height: 20 },
		];

		expect(countPIDLayoutCollisions(separated, [{ id: "b", x: -40, y: -40 }])).toBe(1);
	});

	test("reserves clearance between nodes", () => {
		const close = [
			{ id: "a", x: 0, y: 0, width: 20, height: 20 },
			{ id: "b", x: 27, y: 0, width: 20, height: 20 },
		];

		expect(countPIDLayoutCollisions(close, [])).toBe(1);
		expect(countPIDLayoutCollisions(close, [], 7)).toBe(0);
	});

	test("counts every colliding pair", () => {
		const stacked = [
			{ id: "a", x: 0, y: 0, width: 20, height: 20 },
			{ id: "b", x: 0, y: 0, width: 20, height: 20 },
			{ id: "c", x: 0, y: 0, width: 20, height: 20 },
		];

		expect(countPIDLayoutCollisions(stacked, [])).toBe(3);
	});
});

describe("P&ID layout movement detection", () => {
	test("recognizes already aligned and already distributed layouts", () => {
		const aligned = [
			{ id: "a", x: 10, y: 0, width: 20, height: 20 },
			{ id: "b", x: 10, y: 40, width: 20, height: 20 },
		];
		const distributed = [
			{ id: "a", x: 0, y: 0, width: 20, height: 20 },
			{ id: "b", x: 40, y: 0, width: 20, height: 20 },
			{ id: "c", x: 80, y: 0, width: 20, height: 20 },
		];

		expect(hasPIDLayoutMovement(alignPIDBoxes(aligned, "left"))).toBe(false);
		expect(hasPIDLayoutMovement(distributePIDBoxes(distributed, "horizontal"))).toBe(false);
	});

	test("reports when at least one node would move", () => {
		expect(
			hasPIDLayoutMovement([
				{ id: "a", x: 0, y: 0 },
				{ id: "b", x: 10, y: 0 },
			]),
		).toBe(true);
	});

	test("ignores empty, zero, and sub-pixel rounding-only movement", () => {
		expect(hasPIDLayoutMovement([])).toBe(false);
		expect(hasPIDLayoutMovement([{ id: "a", x: 0, y: 0 }])).toBe(false);
		expect(hasPIDLayoutMovement([{ id: "a", x: 0.0001, y: -0.0001 }])).toBe(false);
	});
});

describe("P&ID keyboard nudging", () => {
	const nodes = [
		{
			id: "holder",
			position: { x: 100, y: 100 },
			width: 100,
			height: 80,
		},
		{
			id: "child",
			parentId: "holder",
			position: { x: 70, y: 40 },
			width: 20,
			height: 20,
		},
		{
			id: "grandchild",
			parentId: "child",
			position: { x: 10, y: 10 },
			width: 8,
			height: 8,
		},
		{
			id: "free",
			position: { x: 300, y: 200 },
			width: 40,
			height: 40,
		},
	];

	test("moves selected roots by the requested grid step", () => {
		expect(nudgePIDNodes(nodes, ["holder", "free"], { x: -10, y: 0 })).toEqual([
			{ id: "holder", x: -10, y: 0 },
			{ id: "free", x: -10, y: 0 },
		]);
		expect(nudgePIDNodes(nodes, ["free"], { x: 0, y: 50 })).toEqual([{ id: "free", x: 0, y: 50 }]);
	});

	test("does not move a selected descendant twice", () => {
		expect(nudgePIDNodes(nodes, ["holder", "grandchild"], { x: 10, y: 0 })).toEqual([
			{ id: "holder", x: 10, y: 0 },
		]);
	});

	test("keeps a selected child within its holder", () => {
		expect(nudgePIDNodes(nodes, ["child"], { x: 50, y: -50 })).toEqual([
			{ id: "child", x: 20, y: -30 },
		]);
	});

	test("uses one constrained movement for the whole selection", () => {
		expect(nudgePIDNodes(nodes, ["child", "free"], { x: 50, y: 0 })).toEqual([
			{ id: "child", x: 20, y: 0 },
			{ id: "free", x: 20, y: 0 },
		]);
	});

	test("ignores missing selected nodes", () => {
		expect(nudgePIDNodes(nodes, ["missing"], { x: 10, y: 0 })).toEqual([]);
	});
});
