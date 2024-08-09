import { describe, test, expect } from "vitest";

import { mergeGraphQLVariables } from "~/lib/utils/mergeGraphQLVariables";
describe("mergeGraphQLVariables", () => {
	test("merges two shallow objects", () => {
		const target: Record<string, unknown> = { foo: "bar" };
		const source: Record<string, unknown> = { baz: "qux" };

		const merged = mergeGraphQLVariables(target, source);
		expect(merged).toEqual({ foo: "bar", baz: "qux" });
	});

	test("merges two deep objects", () => {
		const target: Record<string, unknown> = { foo: { bar: "baz" } };
		const source = { foo: { qux: "quux" } };

		const merged = mergeGraphQLVariables(target, source);
		expect(merged).toEqual({ foo: { bar: "baz", qux: "quux" } });
	});

	test("merges two deep objects with different keys", () => {
		const target: Record<string, unknown> = { foo: { bar: "baz" } };
		const source = { baz: { qux: "quux" } };

		const merged = mergeGraphQLVariables(target, source);
		expect(merged).toEqual({ foo: { bar: "baz" }, baz: { qux: "quux" } });
	});

	test("merges two deep objects where the source overwrites the target", () => {
		const target: Record<string, unknown> = { foo: { bar: "baz" } };
		const source = { foo: { bar: "qux" } };
		const merged = mergeGraphQLVariables(target, source);
		expect(merged).toEqual({ foo: { bar: "qux" } });
	});

	test("merges objects with arrays", () => {
		const target: { foo: number[] } = { foo: [1, 2, 3] };
		const source: { foo: number[] } = { foo: [4, 5] };

		const merged = mergeGraphQLVariables(target, source);
		expect(merged).toEqual({ foo: [4, 5] });
	});

	test("merges objects with different data types", () => {
		const target: Record<string, unknown> = { foo: "bar" };
		const source = { foo: 42 };

		const merged = mergeGraphQLVariables(target, source);
		expect(merged).toEqual({ foo: 42 });
	});

	test("merges objects with nested arrays", () => {
		const target = { foo: { bar: [1, 2, 3] } };
		const source = { foo: { bar: [4, 5] } };

		const merged = mergeGraphQLVariables(target, source);
		expect(merged).toEqual({ foo: { bar: [4, 5] } });
	});

	test("merges objects with target value null", () => {
		const target: Record<string, unknown> = { foo: null };
		const source = { foo: undefined };

		const merged = mergeGraphQLVariables(target, source);
		expect(merged).toEqual({ foo: undefined });
	});

	test("merges objects with target value undefined", () => {
		const target: Record<string, unknown> = { foo: undefined };
		const source = { foo: null };

		const merged = mergeGraphQLVariables(target, source);
		expect(merged).toEqual({ foo: null });
	});

	test("merges objects with source value undefined", () => {
		const target: Record<string, unknown> = { foo: null };
		const source = { foo: undefined };

		const merged = mergeGraphQLVariables(target, source);
		expect(merged).toEqual({ foo: undefined });
	});

	test("overwrite undefined in target with source value", () => {
		const target: Record<string, unknown> = { foo: undefined };
		const source = { foo: "bar" };

		const merged = mergeGraphQLVariables(target, source);
		expect(merged).toEqual({ foo: "bar" });
	});

	test("overwrite value with undefined in source", () => {
		const target: Record<string, unknown> = { foo: "bar" };
		const source = { foo: undefined };

		const merged = mergeGraphQLVariables(target, source);
		expect(merged).toEqual({ foo: undefined });
	});

	test("merge complex objects with single source", () => {
		const target: Record<string, unknown> = {
			foo: {
				key1: undefined,
				key2: "val2",
				key3: undefined,
			},
		};

		const source = {
			foo: {
				key1: "val1",
			},
		};

		const merged = mergeGraphQLVariables(target, source);
		expect(merged).toEqual({
			foo: {
				key1: "val1",
				key2: "val2",
				key3: undefined,
			},
		});
	});
});
