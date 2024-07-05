import { describe, test, expect } from "vitest";

import { base10, base16, base58 } from "../../services/IdPoolManager";
import { toBase } from "../toBase";

import { InvalidArgumentError } from "~/lib/errors/InvalidArgumentError";

describe("toBase", () => {
	test.each([
		{ int: 0, alphabet: base10, expectation: "0" },
		{ int: 10, alphabet: base10, expectation: "10" },
		{ int: 15, alphabet: base16, expectation: "f" },
		{ int: 16, alphabet: base16, expectation: "10" },
		{ int: 17, alphabet: base16, expectation: "11" },
		{ int: 255, alphabet: base16, expectation: "ff" },
		{ int: 0, alphabet: base58, expectation: "1" },
		{ int: 57, alphabet: base58, expectation: "z" },
		{ int: 58, alphabet: base58, expectation: "21" },
		{ int: 1000, alphabet: base58, expectation: "JF" },
	])("$int (base $alphabet.length) -> '$expectation'", ({ int, alphabet, expectation }) => {
		expect(toBase(int, alphabet)).toBe(expectation);
	});

	test("rejects alphabet with duplicates", () => {
		expect(() => toBase(123, "01230123")).toThrow(InvalidArgumentError);
	});

	test("rejects empty alphabet", () => {
		expect(() => toBase(123, "")).toThrow(InvalidArgumentError);
	});

	test("rejects non-integer arg", () => {
		expect(() => toBase(100.5, base16)).toThrow(InvalidArgumentError);
	});
});
