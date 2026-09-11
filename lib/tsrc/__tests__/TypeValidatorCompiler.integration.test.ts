import { describe, expect, expectTypeOf, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import type * as SimpleTypes from "~/lib/tsrc/__tests__/simpleTypes";
import { getSimpleTypeDeclaration, simpleTypesProgram } from "~/lib/tsrc/__tests__/test-helpers";
import { compileValidators } from "~/lib/tsrc/src/compileValidators";
import { renderValidatorModules } from "~/lib/tsrc/src/renderValidatorModules";

type Validator = (value: unknown) => boolean;

describe("compiled validator functions", () => {
	test("validates a string", async () => {
		expectTypeOf<SimpleTypes.TextType>().toEqualTypeOf<string>();
		const validate = await loadValidator("TextType");

		expect(validate("text")).toBe(true);
		expect(validate(42)).toBe(false);
	});

	test("validates a number", async () => {
		expectTypeOf<SimpleTypes.NumberType>().toEqualTypeOf<number>();
		const validate = await loadValidator("NumberType");

		expect(validate(42)).toBe(true);
		expect(validate(Number.NaN)).toBe(true);
		expect(validate("42")).toBe(false);
	});

	test("validates a boolean", async () => {
		expectTypeOf<SimpleTypes.BooleanType>().toEqualTypeOf<boolean>();
		const validate = await loadValidator("BooleanType");

		expect(validate(true)).toBe(true);
		expect(validate(1)).toBe(false);
	});

	test("validates null", async () => {
		expectTypeOf<SimpleTypes.NullType>().toEqualTypeOf<null>();
		const validate = await loadValidator("NullType");

		expect(validate(null)).toBe(true);
		expect(validate(undefined)).toBe(false);
	});

	test("validates undefined", async () => {
		expectTypeOf<SimpleTypes.UndefinedType>().toEqualTypeOf<undefined>();
		const validate = await loadValidator("UndefinedType");

		expect(validate(undefined)).toBe(true);
		expect(validate(null)).toBe(false);
	});

	test("rejects every value for never", async () => {
		expectTypeOf<SimpleTypes.NeverType>().toEqualTypeOf<never>();
		const validate = await loadValidator("NeverType");

		expect(validate(undefined)).toBe(false);
		expect(validate(null)).toBe(false);
		expect(validate("text")).toBe(false);
	});

	test("validates a string literal", async () => {
		expectTypeOf<SimpleTypes.StringLiteralType>().toEqualTypeOf<"text">();
		const validate = await loadValidator("StringLiteralType");

		expect(validate("text")).toBe(true);
		expect(validate("other")).toBe(false);
	});

	test("validates a number literal", async () => {
		expectTypeOf<SimpleTypes.NumberLiteralType>().toEqualTypeOf<42>();
		const validate = await loadValidator("NumberLiteralType");

		expect(validate(42)).toBe(true);
		expect(validate(43)).toBe(false);
	});

	test("validates true", async () => {
		expectTypeOf<SimpleTypes.TrueLiteralType>().toEqualTypeOf<true>();
		const validate = await loadValidator("TrueLiteralType");

		expect(validate(true)).toBe(true);
		expect(validate(false)).toBe(false);
	});

	test("validates false", async () => {
		expectTypeOf<SimpleTypes.FalseLiteralType>().toEqualTypeOf<false>();
		const validate = await loadValidator("FalseLiteralType");

		expect(validate(false)).toBe(true);
		expect(validate(true)).toBe(false);
	});

	test("validates a union", async () => {
		expectTypeOf<SimpleTypes.UnionType>().toEqualTypeOf<string | number>();
		const validate = await loadValidator("UnionType");

		expect(validate("text")).toBe(true);
		expect(validate(42)).toBe(true);
		expect(validate(false)).toBe(false);
	});

	test("validates an array", async () => {
		expectTypeOf<SimpleTypes.ArrayType>().toEqualTypeOf<string[]>();
		const validate = await loadValidator("ArrayType");

		expect(validate([])).toBe(true);
		expect(validate(["first", "second"])).toBe(true);
		expect(validate(["first", 2])).toBe(false);
		expect(validate("first")).toBe(false);
	});

	test("validates an array of union elements", async () => {
		expectTypeOf<SimpleTypes.UnionArrayType>().toEqualTypeOf<(string | number)[]>();
		const validate = await loadValidator("UnionArrayType");

		expect(validate(["first", 2])).toBe(true);
		expect(validate(["first", false])).toBe(false);
	});

	test("validates an object", async () => {
		expectTypeOf<SimpleTypes.ObjectType>().toEqualTypeOf<{ value: string }>();
		const validate = await loadValidator("ObjectType");

		expect(validate({ value: "text" })).toBe(true);
		expect(validate({ value: 42 })).toBe(false);
		expect(validate(null)).toBe(false);
		expect(validate(["text"])).toBe(false);

		// rejects additional object properties
		expect(validate({ value: "text", extra: true })).toBe(false);
	});

	test("validates an object composed from another object type", async () => {
		const validate = await loadValidator("ComposedObjectType");

		expect(validate({ nested: { value: "text" } })).toBe(true);
		expect(validate({ nested: { value: 1 } })).toBe(false);
		expect(validate({ nested: {} })).toBe(false);
		expect(validate({ nested: { value: "text", extra: true } })).toBe(false);
	});

	test("validates an object composed from generic object types", async () => {
		const validate = await loadValidator("ComposedObjectTypeWithGeneric");

		expect(validate({ nestedString: { prop: "text" }, nestedNumber: { prop: 1 } })).toBe(true);
		expect(validate({ nestedString: { prop: 1 }, nestedNumber: { prop: "text" } })).toBe(false);
		expect(validate({ nestedString: { prop: "text" }, nestedNumber: {} })).toBe(false);
	});

	test("validates an optional object property", async () => {
		expectTypeOf<SimpleTypes.OptionalObjectType>().toEqualTypeOf<{ value?: string }>();
		const validate = await loadValidator("OptionalObjectType");

		expect(validate({})).toBe(true);
		expect(validate({ value: "text" })).toBe(true);
		expect(validate({ value: 42 })).toBe(false);

		// rejects additional object properties
		expect(validate({ value: "text", extra: true })).toBe(false);
	});

	test("validates an empty object", async () => {
		expectTypeOf<SimpleTypes.EmptyObjectType>().toExtend<object>();
		const validate = await loadValidator("EmptyObjectType");

		expect(validate({})).toBe(true);
		expect(validate(null)).toBe(false);

		// rejects additional object properties
		expect(validate({ extra: true })).toBe(false);
	});

	test("validates a string index", async () => {
		expectTypeOf<SimpleTypes.StringIndexObjectType>().toEqualTypeOf<Record<string, string>>();
		const validate = await loadValidator("StringIndexObjectType");

		expect(validate({})).toBe(true);
		expect(validate({ first: "text", second: "other" })).toBe(true);
		expect(validate({ first: "text", second: 42 })).toBe(false);
		// expect(validate(["text"])).toBe(false);
		expect(validate(null)).toBe(false);
	});

	test("validates an object with a string index", async () => {
		const validate = await loadValidator("ObjectWithIndexType");

		expect(validate({ a: 1 })).toBe(true);
		expect(validate({ a: 1, text: "value", count: 2 })).toBe(true);
		expect(validate({ a: "value" })).toBe(false);
		expect(validate({ a: 1, invalid: false })).toBe(false);
		expect(validate({})).toBe(false);
		expect(validate(null)).toBe(false);
	});

	test("validates an object intersection", async () => {
		const validate = await loadValidator("IntersectionObjectType");

		expect(validate({ a: "text", b: 1 })).toBe(true);
		expect(validate({ a: "text" })).toBe(false);
		expect(validate({ a: "text", b: "1" })).toBe(false);
		expect(validate({ a: "text", b: 1, extra: true })).toBe(false);
	});

	test("validates an index intersection", async () => {
		const validate = await loadValidator("IndexIntersectionType");

		expect(validate({})).toBe(true);
		expect(validate({ value: "text" })).toBe(false);
		expect(validate({ value: 1 })).toBe(false);
	});

	test("validates a fixed tuple", async () => {
		const validate = await loadValidator("TupleType");

		expect(validate(["text", 1])).toBe(true);
		expect(validate(["text"])).toBe(false);
		expect(validate(["text", 1, 2])).toBe(false);
		expect(validate(["text", "1"])).toBe(false);
		expect(validate({ 0: "text", 1: 1 })).toBe(false);
	});

	test("validates an optional tuple", async () => {
		const validate = await loadValidator("OptionalTupleType");

		expect(validate(["text"])).toBe(true);
		expect(validate(["text", 1])).toBe(true);
		expect(validate(["text", undefined])).toBe(true);
		expect(validate([])).toBe(false);
		expect(validate(["text", 1, 2])).toBe(false);
		expect(validate(["text", "1"])).toBe(false);
	});

	test("validates a rest tuple", async () => {
		const validate = await loadValidator("RestTupleType");

		expect(validate(["text"])).toBe(true);
		expect(validate(["text", 1, 2])).toBe(true);
		expect(validate([])).toBe(false);
		expect(validate(["text", 1, "2"])).toBe(false);
		expect(validate([1])).toBe(false);
	});

	test("validates a tuple with a required suffix after rest", async () => {
		const validate = await loadValidator("SuffixRestTupleType");

		expect(validate(["text", true])).toBe(true);
		expect(validate(["text", 1, 2, true])).toBe(true);
		expect(validate(["text"])).toBe(false);
		expect(validate(["text", 1, 2])).toBe(false);
		expect(validate(["text", true, 1])).toBe(false);
	});

	test("validates a recursive object at every level", async () => {
		const validate = await loadValidator("RecursiveObjectType");

		expect(validate({ value: 1, children: [] })).toBe(true);
		expect(validate({ value: 1, children: [{ value: 2, children: [] }] })).toBe(true);

		// A wrong type deep in the recursion must still be rejected.
		expect(validate({ value: 1, children: [{ value: "two", children: [] }] })).toBe(false);
		expect(validate({ value: 1 })).toBe(false);
	});

	test("validates distinct generic instantiations by their own shape", async () => {
		const load = async (typeName: string, functionName: string): Promise<Validator> => {
			const modules = compileValidators(simpleTypesProgram, [getSimpleTypeDeclaration(typeName)]);
			const [output] = renderValidatorModules(modules);
			const loaded = await loadOutput(output);
			const validator = loaded[functionName];

			if (typeof validator !== "function") {
				throw new Error(`Generated module does not export '${functionName}'`);
			}

			return validator as Validator;
		};

		// Distinct generic instantiations must each validate their own shape. The
		// number boxes carry numbers, so the validator must accept them even though
		// the string boxes share the `Generic` type name.
		const validate = await load("CollidingGenericType", "validateCollidingGenericType");
		expect(
			validate({
				firstString: { prop: "a" },
				secondString: { prop: "b" },
				firstNumber: { prop: 1 },
				secondNumber: { prop: 2 },
			}),
		).toBe(true);

		// Two same-named `ObjectType` interfaces from different files both print as
		// `ObjectType`, so their generic wrappers would share the name
		// `GenericObjectType`. The suffix in `declareFunction` keeps their distinct
		// shapes on distinct validators, so the string boxes are still accepted.
		const validateSameName = await load("SameNameCollisionType", "validateSameNameCollisionType");
		expect(
			validateSameName({
				firstNumber: { prop: { value: 1 } },
				secondNumber: { prop: { value: 2 } },
				firstString: { prop: { value: "a" } },
				secondString: { prop: { value: "b" } },
			}),
		).toBe(true);
	});
});

/**
 * Compiles one type, imports its generated module, and returns its validator.
 */
async function loadValidator(name: string): Promise<Validator> {
	const declaration = getSimpleTypeDeclaration(name);
	const modules = compileValidators(simpleTypesProgram, [declaration]);
	const validatorFunction = modules[0].functions[0];

	const [output] = renderValidatorModules(modules);
	const loaded = await loadOutput(output);

	const validator: unknown = loaded[validatorFunction.name];
	if (typeof validator !== "function") {
		throw new Error(`Generated module does not export '${validatorFunction.name}'`);
	}
	return validator as Validator;
}

async function loadOutput(output: {
	relativePath: string;
	contents: string;
}): Promise<Record<string, unknown>> {
	const directory = await mkdtemp(join(tmpdir(), "tsrc-validator-"));
	const filePath = join(directory, output.relativePath);

	try {
		await mkdir(dirname(filePath), { recursive: true });
		await Bun.write(join(directory, "package.json"), '{"type":"module"}');
		await Bun.write(filePath, output.contents);

		const loaded: unknown = await import(pathToFileURL(filePath).href);
		if (typeof loaded !== "object" || loaded === null) {
			throw new Error(`Generated module '${output.relativePath}' did not load`);
		}

		return loaded as Record<string, unknown>;
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}
