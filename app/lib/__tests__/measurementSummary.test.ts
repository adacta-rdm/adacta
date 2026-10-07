import { describe, expect, test } from "bun:test";

import { MeasurementSummaryBuilder } from "~/app/lib/measurementSummary.ts";

describe("measurement summary", () => {
	test("retains an isolated extreme across a long recording", () => {
		const summary = new MeasurementSummaryBuilder([false, true]);
		for (let index = 0; index < 9000; index++) {
			summary.add(new Date(index * 1000), [null, index === 4321 ? 100 : 1]);
		}
		const result = summary.finish();
		expect(result.overview.length).toBeLessThan(1000);
		expect(result.overview.some((point) => point.values[1] === 100)).toBe(true);
		expect(result.overview[0]?.time).toBe(new Date(0).toISOString());
		expect(result.overview.at(-1)?.time).toBe(new Date(8999 * 1000).toISOString());
		expect(result.columns[1]).toEqual({ count: 9000, missing: 0, minimum: 1, maximum: 100 });
	});

	test("counts missing values and time order defects", () => {
		const summary = new MeasurementSummaryBuilder([false, true]);
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
});
