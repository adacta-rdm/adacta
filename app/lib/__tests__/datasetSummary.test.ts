import { describe, expect, test } from "bun:test";

import { DatasetSummaryBuilder } from "~/app/lib/datasetSummary.ts";

describe("dataset summary", () => {
	test.each(["time", "numeric"] as const)(
		"preserves missing-value boundaries on a %s axis",
		(axisKind) => {
			const summary = new DatasetSummaryBuilder([true, true], axisKind);
			for (let index = 0; index < 9000; index++) {
				const axis = axisKind === "time" ? new Date(index * 1000) : index;
				summary.add(axis, [index >= 4322 && index <= 4324 ? null : 1, index === 5000 ? null : 2]);
			}
			const overview = summary.finish().overview;
			const coordinates = overview.map((point) =>
				"time" in point ? new Date(point.time).getTime() / 1000 : point.x,
			);
			for (const coordinate of [4321, 4322, 4324, 4325, 4999, 5000, 5001]) {
				expect(coordinates).toContain(coordinate);
			}
			expect(overview[coordinates.indexOf(4322)]?.values).toEqual([null, 2]);
			expect(overview[coordinates.indexOf(5000)]?.values).toEqual([1, null]);
		},
	);

	test("retains an isolated extreme across a long recording", () => {
		const summary = new DatasetSummaryBuilder([false, true]);
		for (let index = 0; index < 9000; index++) {
			summary.add(new Date(index * 1000), [null, index === 4321 ? 100 : 1]);
		}
		const result = summary.finish();
		expect(result.overview.length).toBeLessThan(1000);
		expect(result.overview.some((point) => point.values[1] === 100)).toBe(true);
		expect(result.overview[0]).toMatchObject({ time: new Date(0).toISOString() });
		expect(result.overview.at(-1)).toMatchObject({ time: new Date(8999 * 1000).toISOString() });
		expect(result.columns[1]).toEqual({ count: 9000, missing: 0, minimum: 1, maximum: 100 });
	});

	test("bounds a long recording with alternating gaps in different channels", () => {
		const summary = new DatasetSummaryBuilder([true, true, true], "numeric");
		for (let index = 0; index < 100_000; index++) {
			summary.add(index, [index, index % 2 === 0 ? 1 : null, index % 2 === 0 ? null : 2]);
		}
		const result = summary.finish();
		expect(result.overview.length).toBeLessThan(1000);
		expect(result.overview[0]).toMatchObject({ x: 0 });
		expect(result.overview.at(-1)).toMatchObject({ x: 99_999 });
		expect(result.columns[1]).toEqual({ count: 50_000, missing: 50_000, minimum: 1, maximum: 1 });
		expect(result.columns[2]).toEqual({ count: 50_000, missing: 50_000, minimum: 2, maximum: 2 });
		for (const column of [1, 2]) {
			for (let index = 1; index < result.overview.length; index++) {
				const left = result.overview[index - 1]!;
				const right = result.overview[index]!;
				if (left.values[column] === null || right.values[column] === null) continue;
				if (!("x" in left) || !("x" in right)) throw new Error("Expected numeric coordinates.");
				expect(right.x - left.x).toBe(1);
			}
		}
	});

	test("does not connect values across omitted gaps in another channel", () => {
		const summary = new DatasetSummaryBuilder([true, true, true], "numeric");
		const source: (number | null)[][] = [];
		for (let index = 0; index < 5000; index++) {
			const values = [index, index % 17 < 5 ? null : index % 13, index % 13 < 3 ? null : 2];
			source.push(values);
			summary.add(index, values);
		}
		const overview = summary.finish().overview;
		for (let index = 1; index < overview.length; index++) {
			const left = overview[index - 1]!;
			const right = overview[index]!;
			if (!("x" in left) || !("x" in right)) throw new Error("Expected numeric coordinates.");
			for (const column of [1, 2]) {
				if (left.values[column] === null || right.values[column] === null) continue;
				for (let row = left.x + 1; row < right.x; row++) {
					expect(source[row]![column]).not.toBeNull();
				}
			}
		}
	});

	test("counts missing values and time order defects", () => {
		const summary = new DatasetSummaryBuilder([false, true]);
		summary.add(new Date(1000), [null, null]);
		summary.add(new Date(1000), [null, 2]);
		summary.add(new Date(500), [null, 3]);
		summary.add(new Date(3000), [null, null]);
		expect(summary.finish()).toMatchObject({
			columns: [
				{ count: 0, missing: 0, minimum: null, maximum: null },
				{ count: 2, missing: 2, minimum: 2, maximum: 3 },
			],
			largestTimeStepMs: 2500,
			nonIncreasingTimeSteps: 2,
		});
	});

	test("retains numeric coordinates and counts axis order defects", () => {
		const summary = new DatasetSummaryBuilder([true, true], "numeric");
		summary.add(0, [0, 2]);
		summary.add(0, [0, null]);
		summary.add(-1, [-1, 4]);
		summary.add(2, [2, 3]);

		expect(summary.finish()).toMatchObject({
			overview: [
				{ x: 0, values: [0, 2] },
				{ x: 0, values: [0, null] },
				{ x: -1, values: [-1, 4] },
				{ x: 2, values: [2, 3] },
			],
			largestAxisStep: 3,
			nonIncreasingAxisSteps: 2,
			columns: [
				{ count: 4, missing: 0, minimum: -1, maximum: 2 },
				{ count: 3, missing: 1, minimum: 2, maximum: 4 },
			],
		});
	});
});
