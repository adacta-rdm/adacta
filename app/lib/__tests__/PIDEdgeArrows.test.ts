import { describe, expect, test } from "bun:test";

import {
	arrowsAfterKindChange,
	defaultEndArrow,
	isValidArrowConfiguration,
	moveArrowPosition,
	nextArrowPosition,
	positionOnOrthogonalPath,
	removeArrowPosition,
} from "~/app/lib/PIDEdgeArrows.ts";

describe("P&ID connection arrows", () => {
	test("uses the connection-kind endpoint defaults", () => {
		expect(defaultEndArrow("pipe")).toBe(true);
		expect(defaultEndArrow("jacketed")).toBe(true);
		expect(defaultEndArrow("traced")).toBe(false);
		expect(defaultEndArrow("electrical")).toBe(false);
		expect(defaultEndArrow("caption")).toBe(false);
	});

	test("places successive arrows in the largest free interval", () => {
		expect(nextArrowPosition([])).toBe(50);
		expect(nextArrowPosition([50])).toBe(25);
		expect(nextArrowPosition([50, 25])).toBe(75);
		expect(nextArrowPosition(Array.from({ length: 99 }, (_, index) => index + 1))).toBeUndefined();
	});

	test("moves an arrow in place and prevents collisions", () => {
		expect(moveArrowPosition([50, 25], 0, 60)).toEqual([60, 25]);
		expect(moveArrowPosition([50, 25], 0, 25)).toEqual([50, 25]);
		expect(moveArrowPosition([50, 25], 0, 0)).toEqual([50, 25]);
		expect(moveArrowPosition([50, 25], 0, 100)).toEqual([50, 25]);
	});

	test("removes an arrow without reordering the others", () => {
		expect(removeArrowPosition([50, 25, 75], 1)).toEqual([50, 75]);
	});

	test("validates unique in-range positions and keeps non-process lines arrowless", () => {
		expect(isValidArrowConfiguration("pipe", true, [1, 50, 99])).toBe(true);
		expect(isValidArrowConfiguration("pipe", false, [50, 50])).toBe(false);
		expect(isValidArrowConfiguration("pipe", false, [0])).toBe(false);
		expect(isValidArrowConfiguration("pipe", false, [100])).toBe(false);
		expect(isValidArrowConfiguration("caption", true, [])).toBe(false);
		expect(isValidArrowConfiguration("caption", false, [50])).toBe(false);
		expect(isValidArrowConfiguration("caption", false, [])).toBe(true);
		expect(isValidArrowConfiguration("electrical", true, [])).toBe(false);
		expect(isValidArrowConfiguration("electrical", false, [50])).toBe(false);
		expect(isValidArrowConfiguration("electrical", false, [])).toBe(true);
	});

	test("applies connection-kind transition rules", () => {
		expect(
			arrowsAfterKindChange("pipe", "traced", { endArrow: true, arrowPositions: [40] }),
		).toEqual({ endArrow: true, arrowPositions: [40] });
		expect(
			arrowsAfterKindChange("traced", "caption", { endArrow: true, arrowPositions: [40] }),
		).toEqual({ endArrow: false, arrowPositions: [] });
		expect(
			arrowsAfterKindChange("caption", "jacketed", {
				endArrow: false,
				arrowPositions: [],
			}),
		).toEqual({ endArrow: true, arrowPositions: [] });
		expect(
			arrowsAfterKindChange("caption", "traced", { endArrow: false, arrowPositions: [] }),
		).toEqual({ endArrow: false, arrowPositions: [] });
		expect(
			arrowsAfterKindChange("pipe", "electrical", { endArrow: true, arrowPositions: [40] }),
		).toEqual({ endArrow: false, arrowPositions: [] });
		expect(
			arrowsAfterKindChange("electrical", "pipe", { endArrow: false, arrowPositions: [] }),
		).toEqual({ endArrow: true, arrowPositions: [] });
	});
});

describe("positionOnOrthogonalPath", () => {
	test("positions an arrow on a straight route", () => {
		expect(positionOnOrthogonalPath("M 0 0 L 100 0", 25)).toEqual({
			x: 25,
			y: 0,
			direction: { x: 1, y: 0 },
		});
	});

	test("follows source-to-target direction on a reversed route", () => {
		expect(positionOnOrthogonalPath("M 100 0 L 0 0", 25)).toEqual({
			x: 75,
			y: 0,
			direction: { x: -1, y: 0 },
		});
	});

	test("measures over every segment", () => {
		expect(positionOnOrthogonalPath("M 0 0 L 40 0 L 40 60 L 100 60", 50)).toEqual({
			x: 40,
			y: 40,
			direction: { x: 0, y: 1 },
		});
	});

	test("uses the incoming direction exactly at a bend", () => {
		expect(positionOnOrthogonalPath("M 0 0 L 50 0 L 50 50", 50)).toEqual({
			x: 50,
			y: 0,
			direction: { x: 1, y: 0 },
		});
	});

	test("does not position an arrow on a zero-length route", () => {
		expect(positionOnOrthogonalPath("M 10 10 L 10 10", 50)).toBeUndefined();
	});
});
