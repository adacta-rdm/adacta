import { describe, expect, test } from "bun:test";

import { parallelLines } from "~/lib/parallel-lines/ParallelLines.ts";

/**
 * Reads a path of straight segments back into its points, so a test can state
 * the expected geometry as numbers rather than as a string.
 */
function points(path: string): number[][] {
	return [...path.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g)].map((match) => [
		Number(match[1]),
		Number(match[2]),
	]);
}

describe("parallelLines", () => {
	const options = { spacing: 3, lineWidth: 1, shortenForArrow: false };

	test("keeps the centre line on the route", () => {
		const lines = parallelLines("M 0 0 L 100 0", options);

		expect(points(lines.center)).toEqual([
			[0, 0],
			[100, 0],
		]);
	});

	test("places one line on each side of a horizontal route", () => {
		const lines = parallelLines("M 0 0 L 100 0", options);

		const sides = [points(lines.left), points(lines.right)].map((side) => side[0][1]).sort();

		expect(sides).toEqual([-3, 3]);
	});

	test("merges two segments that run the same way", () => {
		const straight = parallelLines("M 0 0 L 100 0", options);
		const split = parallelLines("M 0 0 L 40 0 L 100 0", options);

		expect(points(split.center)).toEqual(points(straight.center));
	});

	test("drops a segment of zero length", () => {
		const withRepeat = parallelLines("M 0 0 L 0 0 L 100 0", options);

		expect(points(withRepeat.center)).toEqual([
			[0, 0],
			[100, 0],
		]);
	});

	test("carries a side line around a corner on the outer side only", () => {
		// The route runs right, then turns down.
		const lines = parallelLines("M 0 0 L 100 0 L 100 100", options);

		const outer = [lines.left, lines.right].filter((side) => points(side).length > 4);

		expect(outer).toHaveLength(1);
	});

	test("stops the side lines short of the end by the spacing", () => {
		const lines = parallelLines("M 0 0 L 100 0", options);

		expect(points(lines.left).at(-1)![0]).toBe(100 - options.spacing);
	});

	test("lets the side lines reach the end when the gap is zero", () => {
		const lines = parallelLines("M 0 0 L 100 0", { ...options, outerEndGap: 0 });

		expect(points(lines.left).at(-1)![0]).toBe(100);
	});

	test("pulls the side lines back by the gap it is given", () => {
		const lines = parallelLines("M 0 0 L 100 0", { ...options, outerEndGap: 12 });

		expect(points(lines.left).at(-1)![0]).toBe(88);
	});

	test("measures the gap from the end of the route, not from the centre line", () => {
		const withArrow = parallelLines("M 0 0 L 100 0", {
			...options,
			shortenForArrow: true,
			outerEndGap: 12,
		});

		// The centre line stops short for the arrow. The side lines must not move
		// with it.
		expect(points(withArrow.center).at(-1)![0]).toBe(100 - options.lineWidth);
		expect(points(withArrow.left).at(-1)![0]).toBe(88);
	});

	test("shortens the centre line when an arrow needs room", () => {
		const lines = parallelLines("M 0 0 L 100 0", { ...options, shortenForArrow: true });

		expect(points(lines.center).at(-1)).toEqual([99, 0]);
	});

	test("covers the side lines with the wider background", () => {
		const lines = parallelLines("M 0 0 L 100 0", options);

		const spread = (path: string) => {
			const ys = points(path).map((point) => point[1]);
			return Math.max(...ys) - Math.min(...ys);
		};

		expect(spread(lines.fullBackground)).toBeGreaterThan(spread(lines.centerBackground));
	});
});
