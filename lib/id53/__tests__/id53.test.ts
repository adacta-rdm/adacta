import {
	afterEach,
	beforeEach,
	describe,
	expect,
	mock,
	setSystemTime,
	spyOn,
	test,
} from "bun:test";

import { configureId53, dateOfId53, id53 } from "~/lib/id53/id53.ts";

const COUNTER_VALUES = 2 ** 11;

/**
 * Returns the counter, which is stored in the lower 11 bits of an ID.
 */
function counterOf(id: number): number {
	return id % COUNTER_VALUES;
}

/**
 * Makes the generator start its counter at the given value. The generator takes
 * its random starting value from Math.random() when it is configured. This
 * helper therefore replaces Math.random() and then configures the generator
 * again.
 */
function startCounterAt(value: number): void {
	spyOn(Math, "random").mockReturnValue(value / COUNTER_VALUES);
	configureId53();
}

/**
 * Moves the test clock forward by the given number of milliseconds.
 */
function advanceClock(milliseconds: number): void {
	setSystemTime(new Date(Date.now() + milliseconds));
}

describe("id53", () => {
	// Each test starts a new sequence. Otherwise, the generator would keep the
	// last millisecond used by the previous test.
	beforeEach(() => configureId53());

	afterEach(() => {
		setSystemTime();
		mock.restore();
	});

	test("an ID encodes the millisecond in which it was generated", () => {
		setSystemTime(new Date("2026-10-02T12:34:56.789Z"));

		expect(dateOfId53(id53())).toEqual(new Date("2026-10-02T12:34:56.789Z"));
	});

	test("IDs strictly increase within a sequence", () => {
		setSystemTime(new Date("2026-10-02T12:00:00.000Z"));
		const made: number[] = [];

		for (let i = 0; i < 10_000; i++) {
			made.push(id53());
			if (i % 1_000 === 0) advanceClock(250);
		}

		for (let i = 1; i < made.length; i++) expect(made[i]).toBeGreaterThan(made[i - 1]!);
	});

	test("the counter does not restart when the millisecond changes", () => {
		setSystemTime(new Date("2026-10-02T12:00:00.000Z"));
		startCounterAt(7);

		const first = id53();
		advanceClock(5_000);
		const second = id53();

		expect(counterOf(second)).toBe(counterOf(first) + 1);
	});

	test("after a counter overflow, the encoded millisecond stays ahead of the clock until the clock catches up", () => {
		setSystemTime(new Date("2026-10-02T12:00:00.000Z"));
		startCounterAt(COUNTER_VALUES - 2);

		const last = id53();
		const wrapped = id53();

		expect(counterOf(last)).toBe(COUNTER_VALUES - 1);
		expect(counterOf(wrapped)).toBe(0);
		expect(dateOfId53(wrapped)).toEqual(new Date("2026-10-02T12:00:00.001Z"));

		setSystemTime(new Date("2026-10-02T12:00:00.001Z"));
		const caughtUp = id53();

		expect(caughtUp).toBeGreaterThan(wrapped);
		expect(dateOfId53(caughtUp)).toEqual(new Date("2026-10-02T12:00:00.001Z"));
	});

	test("a clock that moves backward does not make IDs smaller", () => {
		setSystemTime(new Date("2026-10-02T12:00:00.000Z"));

		const before = id53();
		setSystemTime(new Date("2026-10-02T11:59:50.000Z"));
		const after = id53();

		expect(after).toBeGreaterThan(before);
		expect(dateOfId53(after)).toEqual(new Date("2026-10-02T12:00:00.000Z"));
	});

	test("a clock earlier than the epoch is rejected", () => {
		setSystemTime(new Date("2025-12-31T23:59:59.999Z"));

		expect(() => id53()).toThrow(RangeError);
	});

	test("a clock later than the last millisecond that 42 bits can hold is rejected", () => {
		// The millisecond 2^42 milliseconds after the epoch is the first one
		// that does not fit in 42 bits. An ID for that millisecond would be
		// larger than 2^53 - 1.
		setSystemTime(new Date(Date.UTC(2026, 0, 1) + 2 ** 42));

		expect(() => id53()).toThrow(RangeError);
	});

	test("the largest ID is a safe integer", () => {
		setSystemTime(new Date(Date.UTC(2026, 0, 1) + 2 ** 42 - 1));
		startCounterAt(COUNTER_VALUES - 2);

		expect(id53()).toBe(Number.MAX_SAFE_INTEGER);
	});

	test("the counter starts at a random value", () => {
		setSystemTime(new Date("2026-10-02T12:00:00.000Z"));
		const firstIds = new Set(
			Array.from({ length: 20 }, () => {
				configureId53();
				return id53();
			}),
		);

		expect(firstIds.size).toBeGreaterThan(1);
	});

	test("the encoded time is counted from the configured epoch", () => {
		setSystemTime(new Date("2030-06-01T08:00:00.000Z"));
		configureId53({ epoch: new Date("2030-01-01T00:00:00.000Z") });

		const id = id53();

		expect(dateOfId53(id)).toEqual(new Date("2030-06-01T08:00:00.000Z"));
		expect(id).toBeLessThan(2 ** 46);
	});
});
