import { describe, test, expect } from "vitest";

import {
	assertIntersection,
	assertITest,
	assertUnion,
	castIntersection,
	castITest,
	castUnion,
	isIntersection,
	isITest,
	isUnion,
} from "@/tsrc/scripts/__tests__/tsrc.spec";

describe("tsrc", () => {
	test("generated 'is'-Function returns false if input is invalid", () => {
		// missing properties
		expect(isITest({})).toBe(false);
		expect(isITest({ a: "a" })).toBe(false);
		// wrong types
		expect(isITest({ a: 1, b: "b" })).toBe(false);
		// additional properties
		expect(isITest({ a: "a", b: 1, c: null })).toBe(false);
		// correct
		expect(isITest({ a: "a", b: 1 })).toBe(true);

		expect(isUnion({ b: 1 })).toBe(false);
		expect(isUnion({ c: false })).toBe(true);

		expect(isIntersection({ a: "a", b: 1 })).toBe(false);
		expect(isIntersection({ a: "a", b: 1, c: false })).toBe(true);
	});

	test("generated 'assert'-Function throws if input is invalid", () => {
		// missing properties
		expect(() => assertITest({})).toThrow();
		expect(() => assertITest({ a: "a" })).toThrow();
		// wrong types
		expect(() => assertITest({ a: 1, b: "b" })).toThrow();
		// additional properties
		expect(() => assertITest({ a: "a", b: 1, c: null })).toThrow();
		// correct
		expect(() => assertITest({ a: "a", b: 1 })).not.toThrow();

		expect(() => assertUnion({ b: 1 })).toThrow();
		expect(() => assertUnion({ c: false })).not.toThrow();

		expect(() => assertIntersection({ a: "a", b: 1 })).toThrow();
		expect(() => assertIntersection({ a: "a", b: 1, c: false })).not.toThrow();
	});

	test("generated 'cast'-Function throws if input is invalid", () => {
		// missing properties
		expect(() => castITest({})).toThrow();
		expect(() => castITest({ a: "a" })).toThrow();
		// wrong types
		expect(() => castITest({ a: 1, b: "b" })).toThrow();
		// additional properties
		expect(() => castITest({ a: "a", b: 1, c: null })).toThrow();
		// correct
		const arg = { a: "a", b: 1 };
		expect(castITest(arg)).toBe(arg);

		expect(() => castUnion({ b: 1 })).toThrow();
		const arg2 = { c: false };
		expect(castUnion(arg2)).toBe(arg2);

		expect(() => castIntersection({ a: "a", b: 1 })).toThrow();
		const arg3 = { a: "a", b: 1, c: false };
		expect(castIntersection(arg3)).toBe(arg3);
	});
});

export interface ITest {
	a: string;
	b: number;
}

export type Intersection = ITest & { c: boolean };
export type Union = ITest | { c: boolean };
