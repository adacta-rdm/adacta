import { describe, test, expect } from "vitest";

import { groupMonotonic } from "../groupMonotonic";

const sampleData = [
	{ x: 0, y: 5 }, // 0
	{ x: 1, y: 5 }, // 1
	{ x: 2, y: 5 }, // 2
	//
	{ x: 1, y: 5 }, // 3
	{ x: 3, y: 5 }, // 4
	{ x: 4, y: 5 }, // 5
	{ x: 5, y: 5 }, // 6
	//
	{ x: 4, y: 5 }, // 7
	{ x: 3, y: 5 }, // 8
	{ x: 2, y: 5 }, // 9
	{ x: 1, y: 5 }, // 10
	//
	{ x: 2, y: 5 }, // 11
	{ x: 3, y: 5 }, // 12
];

const sampleDataBig = [
	{ x: 0.05, y: 0 },
	{ x: 0.06, y: 0 },
	{ x: 0.082, y: 0 },
	{ x: 0.106, y: 0 },
	{ x: 0.126, y: 0 },
	{ x: 0.144, y: 0 },
	{ x: 0.19, y: 0 },
	{ x: 0.197, y: 0 },
	{ x: 0.224, y: 0 },
	{ x: 0.244, y: 0 },
	{ x: 0.283, y: 0 },
	{ x: 0.301, y: 0 },
	{ x: 0.317, y: 0 },
	{ x: 0.336, y: 0 },
	{ x: 0.369, y: 0 },
	{ x: 0.385, y: 0 },
	{ x: 0.417, y: 0 },
	{ x: 0.426, y: 0 },
	{ x: 0.455, y: 0 },
	{ x: 0.479, y: 0 },
	{ x: 0.497, y: 0 },
	{ x: 0.523, y: 0 },
	{ x: 0.557, y: 0 },
	{ x: 0.574, y: 0 },
	{ x: 0.601, y: 0 },
	{ x: 0.619, y: 0 },
	{ x: 0.644, y: 0 },
	{ x: 0.669, y: 0 },
	{ x: 0.697, y: 0 },
	{ x: 0.729, y: 0 },
	{ x: 0.749, y: 0 },
	{ x: 0.769, y: 0 },
	{ x: 0.793, y: 0 },
	{ x: 0.813, y: 0 },
	{ x: 0.84, y: 0 },
	{ x: 0.864, y: 0 },
	{ x: 0.876, y: 0 },
	{ x: 0.899, y: 0 },
	{ x: 0.939, y: 0 },
	{ x: 0.953, y: 0 },
	{ x: 0.969, y: 0 },
	{ x: 0.994, y: 0 },
	{ x: 1.024, y: 0 },
	{ x: 1.054, y: 0 },
	{ x: 1.066, y: 0 },
	{ x: 1.101, y: 0 },
	{ x: 1.125, y: 0 },
	{ x: 1.145, y: 0 },
	{ x: 1.167, y: 0 },
	{ x: 1.199, y: 0 },
	{ x: 1.191, y: 0 },
	{ x: 1.17, y: 0 },
	{ x: 1.143, y: 0 },
	{ x: 1.123, y: 0 },
	{ x: 1.095, y: 0 },
	{ x: 1.081, y: 0 },
	{ x: 1.044, y: 0 },
	{ x: 1.024, y: 0 },
	{ x: 0.992, y: 0 },
	{ x: 0.988, y: 0 },
	{ x: 0.96, y: 0 },
	{ x: 0.937, y: 0 },
	{ x: 0.917, y: 0 },
	{ x: 0.896, y: 0 },
	{ x: 0.866, y: 0 },
	{ x: 0.848, y: 0 },
	{ x: 0.807, y: 0 },
	{ x: 0.783, y: 0 },
	{ x: 0.765, y: 0 },
	{ x: 0.743, y: 0 },
	{ x: 0.718, y: 0 },
	{ x: 0.695, y: 0 },
	{ x: 0.672, y: 0 },
	{ x: 0.639, y: 0 },
	{ x: 0.618, y: 0 },
	{ x: 0.608, y: 0 },
	{ x: 0.578, y: 0 },
	{ x: 0.551, y: 0 },
	{ x: 0.537, y: 0 },
	{ x: 0.516, y: 0 },
	{ x: 0.48, y: 0 },
	{ x: 0.464, y: 0 },
	{ x: 0.437, y: 0 },
	{ x: 0.416, y: 0 },
	{ x: 0.394, y: 0 },
	{ x: 0.362, y: 0 },
	{ x: 0.34, y: 0 },
	{ x: 0.31, y: 0 },
	{ x: 0.29, y: 0 },
	{ x: 0.268, y: 0 },
	{ x: 0.243, y: 0 },
	{ x: 0.22, y: 0 },
	{ x: 0.213, y: 0 },
	{ x: 0.17, y: 0 },
	{ x: 0.149, y: 0 },
	{ x: 0.138, y: 0 },
	{ x: 0.099, y: 0 },
	{ x: 0.078, y: 0 },
	{ x: 0.065, y: 0 },
	{ x: 0.051, y: 0 },
];

const sampleDataUI = [
	{ x: 0, y: 1 },
	{ x: 1, y: 1 },
	{ x: 2, y: 1 },
	{ x: 3, y: 2 },
	{ x: 2, y: 2 },
	{ x: 1, y: 2 },
	{ x: 3, y: 2 },
	{ x: 4, y: 2 },
];

describe("groupMonotonous", () => {
	test("groups small dataset", () => {
		const data = groupMonotonic(sampleData);
		expect(data).toHaveLength(4);
		expect(data).toMatchSnapshot();
	});

	test("groups real dataset", () => {
		const data = groupMonotonic(sampleDataBig);
		expect(data).toHaveLength(2);
		expect(data).toMatchSnapshot();
	});

	test("groups dataset for UI with additional points to get continuous line", () => {
		const data = groupMonotonic(sampleDataUI, true);
		expect(data).toHaveLength(3);
		expect(data).toMatchSnapshot();
	});

	test("detect short sections consisting of only two points", () => {
		const rawData = [
			[0, 5],
			[1, 5],
			[0, 4],
			[1, 4],
		].map(([x, y]) => ({ x, y }));
		const data = groupMonotonic(rawData);
		expect(data).toHaveLength(2);
		expect(data).toMatchSnapshot();
	});

	test("supports repeated values", () => {
		const rawData = [
			[0, 1],
			[1, 1],
			[1, 1],
			[1, 1],
			[0, 1],
		].map(([x, y]) => ({ x, y }));
		const data = groupMonotonic(rawData);
		expect(data).toHaveLength(2);
		expect(data).toMatchSnapshot();
	});
});
