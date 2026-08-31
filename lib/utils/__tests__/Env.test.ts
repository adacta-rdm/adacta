import { describe, expect, test } from "bun:test";

import { Env, type EnvSource, InvalidEnvTypeError, MissingEnvError } from "~/lib/utils/Env";

describe("Env", () => {
	describe("populate", () => {
		test("adds values to a target", () => {
			const target: EnvSource = { EXISTING: "value" };

			new Env({ ADDED: "value" }).populate(target);

			expect(target).toEqual({ EXISTING: "value", ADDED: "value" });
		});

		test("preserves existing values by default", () => {
			const target: EnvSource = { VALUE: "existing" };

			new Env({ VALUE: "loaded" }).populate(target);

			expect(target).toEqual({ VALUE: "existing" });
		});

		test("overrides existing values when requested", () => {
			const target: EnvSource = { VALUE: "existing" };

			new Env({ VALUE: "loaded" }).populate(target, true);

			expect(target).toEqual({ VALUE: "loaded" });
		});
	});

	describe("string", () => {
		test("throws a custom error when a required value is missing", () => {
			expect(() => new Env({}).string("MISSING")).toThrow(MissingEnvError);
		});

		test("returns undefined when the default is undefined", () => {
			expect(new Env({}).string("MISSING", undefined)).toBeUndefined();
		});
	});

	describe("int", () => {
		test("reads an integer", () => {
			expect(new Env({ PORT: "5432" }).int("PORT")).toBe(5432);
			expect(new Env({}).int("PORT", 5000)).toBe(5000);
			expect(new Env({}).int("PORT", undefined)).toBeUndefined();
		});

		test("rejects an invalid integer", () => {
			expectInvalidEnvType(() => new Env({ PORT: "1.5" }).int("PORT"), /PORT.*integer/);
			expectInvalidEnvType(() => new Env({ PORT: "12px" }).int("PORT"), /PORT.*integer/);
		});
	});

	describe("number", () => {
		test("reads a number", () => {
			expect(new Env({ RATE: "1.5" }).number("RATE")).toBe(1.5);
			expect(new Env({}).number("RATE", 0.5)).toBe(0.5);
			expect(new Env({}).number("RATE", undefined)).toBeUndefined();
		});

		test("rejects an invalid number", () => {
			expectInvalidEnvType(() => new Env({ RATE: "12px" }).number("RATE"), /RATE.*number/);
			expectInvalidEnvType(() => new Env({ RATE: "Infinity" }).number("RATE"), /RATE.*number/);
		});
	});

	describe("boolean", () => {
		test("reads a boolean", () => {
			expect(new Env({ ENABLED: "yes" }).boolean("ENABLED")).toBe(true);
			expect(new Env({ ENABLED: "off" }).boolean("ENABLED")).toBe(false);
			expect(new Env({}).boolean("ENABLED", true)).toBe(true);
			expect(new Env({}).boolean("ENABLED", undefined)).toBeUndefined();
			expectInvalidEnvType(
				() => new Env({ ENABLED: "sometimes" }).boolean("ENABLED"),
				/ENABLED.*boolean/,
			);
		});
	});

	describe("url", () => {
		test("reads a URL", () => {
			expect(new Env({ BASE_URL: "https://configured.example/path" }).url("BASE_URL")).toEqual(
				new URL("https://configured.example/path"),
			);
		});

		test("uses string and URL defaults", () => {
			expect(new Env({}).url("BASE_URL", "https://string.example")).toEqual(
				new URL("https://string.example"),
			);

			const defaultURL = new URL("https://url.example");
			expect(new Env({}).url("BASE_URL", defaultURL)).toEqual(defaultURL);
		});

		test("returns undefined when the default is undefined", () => {
			expect(new Env({}).url("BASE_URL", undefined)).toBeUndefined();
		});

		test("rejects an invalid URL with the custom type error", () => {
			expectInvalidEnvType(
				() => new Env({ BASE_URL: "not a URL" }).url("BASE_URL"),
				/BASE_URL.*URL/,
			);
		});
	});
});

function expectInvalidEnvType(action: () => unknown, message: RegExp): void {
	try {
		action();
		expect.unreachable("Expected invalid environment value to throw");
	} catch (error) {
		expect(error).toBeInstanceOf(InvalidEnvTypeError);
		expect(error).toBeInstanceOf(TypeError);
		expect((error as Error).message).toMatch(message);
	}
}
