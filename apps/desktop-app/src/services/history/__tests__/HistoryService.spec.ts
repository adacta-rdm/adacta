import { describe, test, expect, beforeEach } from "vitest";

import { HistoryService } from "../HistoryService";

import type { RouterArgs } from "@/routes";

// @vitest-environment jsdom
describe("Save history", () => {
	let history: HistoryService;

	beforeEach(() => {
		localStorage.clear();
		history = new HistoryService();
	});

	function sampleArgs(sampleId: string, repositoryId = "1"): RouterArgs {
		return [
			"/repositories/:repositoryId/samples/:sampleId",
			{
				repositoryId,
				sampleId,
			},
		];
	}

	test("Get recently", () => {
		history.push(...sampleArgs("s1"));
		history.push(...sampleArgs("s2"));
		history.push(...sampleArgs("s3"));

		expect(history.getMostRecentlyIds().map(({ id }) => id)).toEqual(["s3", "s2", "s1"]);

		history.push(...sampleArgs("s1"));

		expect(history.getMostRecentlyIds().map(({ id }) => id)).toEqual(["s1", "s3", "s2"]);
	});

	test("Get frequently", () => {
		history.push(...sampleArgs("s1"));
		history.push(...sampleArgs("s1"));
		history.push(...sampleArgs("s2"));

		expect(history.getMostFrequentlyIds().map(({ id }) => id)).toEqual(["s1", "s2"]);

		history.push(...sampleArgs("s2"));
		history.push(...sampleArgs("s2"));

		expect(history.getMostFrequentlyIds().map(({ id }) => id)).toEqual(["s2", "s1"]);
		expect(history.getMostFrequentlyIds(1).map(({ id }) => id)).toEqual(["s2"]);
	});

	test("Limit persisted history size to 100", () => {
		for (let i = 0; i < 300; i++) {
			history.push(...sampleArgs(`s${i}`));
		}

		const restoredHistory = new HistoryService();
		expect(restoredHistory.getMostRecentlyIds(Infinity)).toHaveLength(100);
	});

	test("Frequency is persisted for unlimited items", () => {
		// Visit sample a few times
		for (let i = 0; i < 20; i++) {
			history.push(...sampleArgs("s1"));
		}

		// Add some noise  into the history
		for (let i = 0; i < 300; i++) {
			history.push(...sampleArgs(`noise${i}`));
		}

		// Visit additional sample a few times
		for (let i = 0; i < 15; i++) {
			history.push(...sampleArgs("s2"));
		}

		const restoredHistory = new HistoryService();
		const frequentIds = restoredHistory.getMostFrequentlyIds(Infinity).map(({ id }) => id);

		// expect favourite samples to be the top entry
		expect(frequentIds[0]).toBe("s1");
		expect(frequentIds[1]).toBe("s2");
		expect(frequentIds).toHaveLength(302);
	});
});
