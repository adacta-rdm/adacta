import { describe, test, expect } from "vitest";

import type { IProgressValue } from "../IProgressReporterFn";
import { createProgressReporter } from "../createProgressReporter";

describe("createProgressReporter", () => {
	describe("set progress", () => {
		test("decreasing the progress has no effect", () => {
			let progress = 0 as IProgressValue;
			const reporter = createProgressReporter(({ value }) => (progress = value));

			reporter(70);
			reporter(50);
			expect(progress).toBe(70);
		});
	});

	describe("status", () => {
		test("Status is reported correctly", () => {
			let currentStatus: string | undefined;
			const reporter = createProgressReporter(({ status }) => (currentStatus = status));
			reporter(50, "Doing something");
			expect(currentStatus).toBe("Doing something");
		});
	});

	describe("fork()", () => {
		test("cannot call fork() multiple times", () => {
			const reporter = createProgressReporter(() => {});
			reporter.fork(50);

			expect(() => reporter.fork(50)).toThrow(/fork/);
		});

		test("forked progress scales value correctly", () => {
			let progress = 0 as IProgressValue;
			const [reporter] = createProgressReporter(({ value }) => (progress = value)).fork(50);

			reporter(0);
			expect(progress).toBe(0);
			reporter(50);
			expect(progress).toBe(25);
			reporter(100);
			expect(progress).toBe(50);
		});

		test("forked progress clamps values to [min, max]", () => {
			let progress = 0 as IProgressValue;
			const [reporter1] = createProgressReporter(({ value }) => (progress = value)).fork(50);

			reporter1(-5);
			expect(progress).toBe(0);
			reporter1(200);
			expect(progress).toBe(50);
		});

		test("unordered calls to forked progresses do not mess up the aggregated progress", () => {
			let progress = 0 as IProgressValue;
			const [reporter0to25, reporter25to50, reporter50to100] = createProgressReporter(
				({ value }) => (progress = value)
			).fork(25, 50);

			reporter50to100(50);
			expect(progress).toBe(25);
			reporter0to25(100);
			expect(progress).toBe(50);
			reporter25to50(50);
			expect(progress).toBe(62.5);
		});

		test("fork of fork of forked reporter", () => {
			let progress = 0 as IProgressValue;
			const [reporter0to50, reporter50to100] = createProgressReporter(
				({ value }) => (progress = value)
			).forkEqual(2);

			const [reporter0to25, reporter25to50] = reporter0to50.forkEqual(2);
			const [reporter0to5, reporter5to25] = reporter0to25.fork(20);

			reporter50to100(50);
			expect(progress).toBe(25);
			reporter0to5(100);
			expect(progress).toBe(30);
			reporter25to50(100);
			expect(progress).toBe(55);
			reporter50to100(100);
			expect(progress).toBe(80);
			reporter5to25(100);
			expect(progress).toBe(100);
		});
	});

	describe("forkEqual()", () => {
		test("creates child reporters with equal shares", () => {
			let progress = 0 as IProgressValue;
			const [reporter0to25, reporter25to50, reporter50to75, reporter75to100] =
				createProgressReporter(({ value }) => (progress = value)).forkEqual(4);

			reporter0to25(100);
			expect(progress).toBe(25);
			reporter25to50(100);
			expect(progress).toBe(50);
			reporter50to75(100);
			expect(progress).toBe(75);
			reporter75to100(100);
			expect(progress).toBe(100);
		});
	});
});
