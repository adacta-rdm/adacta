import { describe, expect, expectTypeOf, test } from "bun:test";

import type * as SimpleTypes from "~/lib/tsrc/__tests__/simpleTypes";
import {
	getExternalObjectTypeDeclaration,
	getSimpleTypeDeclaration,
	simpleTypesProgram,
} from "~/lib/tsrc/__tests__/test-helpers";
import { compileValidators } from "~/lib/tsrc/src/compileValidators";

describe("compileValidators", () => {
	test("places a validator in its source module", () => {
		const modules = compileSimpleType("ObjectType");
		const modulePath = "lib/tsrc/__tests__/simpleTypes";

		expect(modules).toHaveLength(1);
		expect(modules[0]).toMatchObject({ modulePath, imports: [] });
		expect(modules[0].functions).toHaveLength(1);
		expect(modules[0].functions[0]).toMatchObject({
			name: "validateObjectType",
			exported: true,
		});
	});

	test("compiles a string declaration", () => {
		expectTypeOf<SimpleTypes.TextType>().toEqualTypeOf<string>();
		expectExpression("TextType", { kind: "typeof", type: "string" });
	});

	test("compiles a number declaration", () => {
		expectTypeOf<SimpleTypes.NumberType>().toEqualTypeOf<number>();
		expectExpression("NumberType", { kind: "typeof", type: "number" });
	});

	test("compiles a boolean declaration", () => {
		expectTypeOf<SimpleTypes.BooleanType>().toEqualTypeOf<boolean>();
		expectExpression("BooleanType", { kind: "typeof", type: "boolean" });
	});

	test("compiles a null declaration", () => {
		expectTypeOf<SimpleTypes.NullType>().toEqualTypeOf<null>();
		expectExpression("NullType", { kind: "literal", value: null });
	});

	test("compiles an undefined declaration", () => {
		expectTypeOf<SimpleTypes.UndefinedType>().toEqualTypeOf<undefined>();
		expectExpression("UndefinedType", { kind: "literal", value: undefined });
	});

	test("compiles a never declaration", () => {
		expectTypeOf<SimpleTypes.NeverType>().toEqualTypeOf<never>();
		expectExpression("NeverType", { kind: "reject" });
	});

	test("compiles a string literal declaration", () => {
		expectTypeOf<SimpleTypes.StringLiteralType>().toEqualTypeOf<"text">();
		expectExpression("StringLiteralType", { kind: "literal", value: "text" });
	});

	test("compiles a number literal declaration", () => {
		expectTypeOf<SimpleTypes.NumberLiteralType>().toEqualTypeOf<42>();
		expectExpression("NumberLiteralType", { kind: "literal", value: 42 });
	});

	test("compiles a true literal declaration", () => {
		expectTypeOf<SimpleTypes.TrueLiteralType>().toEqualTypeOf<true>();
		expectExpression("TrueLiteralType", { kind: "literal", value: true });
	});

	test("compiles a false literal declaration", () => {
		expectTypeOf<SimpleTypes.FalseLiteralType>().toEqualTypeOf<false>();
		expectExpression("FalseLiteralType", { kind: "literal", value: false });
	});

	test("compiles a union declaration", () => {
		expectTypeOf<SimpleTypes.UnionType>().toEqualTypeOf<string | number>();
		expectExpression("UnionType", {
			kind: "or",
			expressions: [
				{ kind: "typeof", type: "string" },
				{ kind: "typeof", type: "number" },
			],
		});
	});

	test("compiles an array declaration", () => {
		expectTypeOf<SimpleTypes.ArrayType>().toEqualTypeOf<string[]>();
		expectExpression("ArrayType", {
			kind: "array",
			element: { kind: "typeof", type: "string" },
		});
	});

	test("compiles an object declaration", () => {
		expectTypeOf<SimpleTypes.ObjectType>().toEqualTypeOf<{ value: string }>();
		expectExpression("ObjectType", {
			kind: "object",
			name: "ObjectType",
			properties: [
				{
					name: "value",
					optional: false,
					expression: { kind: "typeof", type: "string" },
				},
			],
		});
	});

	test("compiles an object composed from another object type", () => {
		expectTypeOf<SimpleTypes.ComposedObjectType>().toEqualTypeOf<{
			nested: SimpleTypes.ObjectType;
		}>();
		expectExpression("ComposedObjectType", {
			kind: "object",
			name: "ComposedObjectType",
			properties: [
				{
					name: "nested",
					optional: false,
					expression: {
						kind: "object",
						name: "ObjectType",
						properties: [
							{
								name: "value",
								optional: false,
								expression: { kind: "typeof", type: "string" },
							},
						],
					},
				},
			],
		});
	});

	test("compiles an object composed from generic object types", () => {
		expectTypeOf<SimpleTypes.ComposedObjectTypeWithGeneric>().toEqualTypeOf<{
			nestedString: { prop: string };
			nestedNumber: { prop: number };
		}>();
		expectExpression("ComposedObjectTypeWithGeneric", {
			kind: "object",
			name: "ComposedObjectTypeWithGeneric",
			properties: [
				{
					name: "nestedString",
					optional: false,
					expression: {
						kind: "object",
						name: "GenericString",
						properties: [
							{
								name: "prop",
								optional: false,
								expression: { kind: "typeof", type: "string" },
							},
						],
					},
				},
				{
					name: "nestedNumber",
					optional: false,
					expression: {
						kind: "object",
						name: "GenericNumber",
						properties: [
							{
								name: "prop",
								optional: false,
								expression: { kind: "typeof", type: "number" },
							},
						],
					},
				},
			],
		});
	});

	test("compiles an optional object property", () => {
		expectTypeOf<SimpleTypes.OptionalObjectType>().toEqualTypeOf<{ value?: string }>();
		expectExpression("OptionalObjectType", {
			kind: "object",
			name: "OptionalObjectType",
			properties: [
				{
					name: "value",
					optional: true,
					expression: { kind: "typeof", type: "string" },
				},
			],
		});
	});

	test("compiles an empty object declaration", () => {
		expectTypeOf<SimpleTypes.EmptyObjectType>().toExtend<object>();
		expectExpression("EmptyObjectType", {
			kind: "object",
			name: "EmptyObjectType",
			properties: [],
		});
	});

	test("compiles a string index declaration", () => {
		expectTypeOf<SimpleTypes.StringIndexObjectType>().toEqualTypeOf<Record<string, string>>();
		expectExpression("StringIndexObjectType", {
			kind: "object",
			name: "StringIndexObjectType",
			properties: [],
			stringIndex: { kind: "typeof", type: "string" },
		});
	});

	test("compiles an object with a string index declaration", () => {
		expectTypeOf<SimpleTypes.ObjectWithIndexType>().toEqualTypeOf<{
			a: number;
			[key: string]: string | number;
		}>();
		expectExpression("ObjectWithIndexType", {
			kind: "object",
			name: "ObjectWithIndexType",
			properties: [
				{
					name: "a",
					optional: false,
					expression: { kind: "typeof", type: "number" },
				},
			],
			stringIndex: {
				kind: "or",
				expressions: [
					{ kind: "typeof", type: "string" },
					{ kind: "typeof", type: "number" },
				],
			},
		});
	});

	test("compiles an object intersection declaration", () => {
		expectTypeOf<SimpleTypes.IntersectionObjectType>().toEqualTypeOf<
			{ a: string } & { b: number }
		>();
		expectExpression("IntersectionObjectType", {
			kind: "object",
			name: "IntersectionObjectType",
			properties: [
				{
					name: "a",
					optional: false,
					expression: { kind: "typeof", type: "string" },
				},
				{
					name: "b",
					optional: false,
					expression: { kind: "typeof", type: "number" },
				},
			],
		});
	});

	test("compiles an index intersection declaration", () => {
		expectTypeOf<SimpleTypes.IndexIntersectionType>().toEqualTypeOf<
			Record<string, string> & Record<string, number>
		>();
		expectExpression("IndexIntersectionType", {
			kind: "and",
			expressions: [
				{
					kind: "object",
					properties: [],
					stringIndex: { kind: "typeof", type: "string" },
				},
				{
					kind: "object",
					properties: [],
					stringIndex: { kind: "typeof", type: "number" },
				},
			],
		});
	});

	test("compiles a fixed tuple declaration", () => {
		expectTypeOf<SimpleTypes.TupleType>().toEqualTypeOf<[string, number]>();
		expectExpression("TupleType", {
			kind: "tuple",
			elements: [
				{
					kind: "required",
					expression: { kind: "typeof", type: "string" },
				},
				{
					kind: "required",
					expression: { kind: "typeof", type: "number" },
				},
			],
		});
	});

	test("compiles an optional tuple declaration", () => {
		expectTypeOf<SimpleTypes.OptionalTupleType>().toEqualTypeOf<[string, number?]>();
		expectExpression("OptionalTupleType", {
			kind: "tuple",
			elements: [
				{
					kind: "required",
					expression: { kind: "typeof", type: "string" },
				},
				{
					kind: "optional",
					expression: { kind: "typeof", type: "number" },
				},
			],
		});
	});

	test("compiles a rest tuple declaration", () => {
		expectTypeOf<SimpleTypes.RestTupleType>().toEqualTypeOf<[string, ...number[]]>();
		expectExpression("RestTupleType", {
			kind: "tuple",
			elements: [
				{
					kind: "required",
					expression: { kind: "typeof", type: "string" },
				},
				{
					kind: "rest",
					expression: { kind: "typeof", type: "number" },
				},
			],
		});
	});

	test("compiles a tuple with a required suffix after rest", () => {
		expectTypeOf<SimpleTypes.SuffixRestTupleType>().toEqualTypeOf<[string, ...number[], boolean]>();
		expectExpression("SuffixRestTupleType", {
			kind: "tuple",
			elements: [
				{
					kind: "required",
					expression: { kind: "typeof", type: "string" },
				},
				{
					kind: "rest",
					expression: { kind: "typeof", type: "number" },
				},
				{
					kind: "required",
					expression: { kind: "typeof", type: "boolean" },
				},
			],
		});
	});
});

describe("aborts on non-JSON types", () => {
	// Each type has no JSON form, so compiling it must fail loudly rather than
	// emit a validator that checks a shape the input can never have.
	test.each([
		"BigIntType",
		"SymbolType",
		"BigIntLiteralType",
		"DateType",
		"MapType",
		"FunctionType",
	])("aborts on %s", (name) => {
		expect(() => compileSimpleType(name)).toThrow(/no JSON form/);
	});
});

describe("named type reuse", () => {
	test("emits one helper for a reused named type", () => {
		const functions = compileNamedTypeFunctions();
		const root = functions.find((validator) => validator.name === "validateReusedObjectType");
		const helper = functions.find((validator) => validator.name === "validateObjectType");

		expect(functions).toHaveLength(2);
		if (!root || !helper) throw new Error("Expected root and helper validator functions");

		expect(root).toMatchObject({
			name: "validateReusedObjectType",
			exported: true,
			expression: { kind: "object", name: "ReusedObjectType" },
		});
		expect(helper).toMatchObject({
			name: "validateObjectType",
			exported: false,
			expression: { kind: "object", name: "ObjectType" },
		});

		if (root.expression.kind !== "object") throw new Error("Expected an object root expression");

		expect(root.expression.properties.map((property) => property.name)).toEqual([
			"first",
			"second",
			"third",
		]);

		expect(root.expression.properties[0].expression).toBe(root.expression.properties[1].expression);
		expect(root.expression.properties[0].expression).toBe(root.expression.properties[2].expression);
	});

	test("compiles a recursive object type into a self-calling validator", () => {
		const modules = compileSimpleType("RecursiveObjectType");

		expect(modules).toHaveLength(1);
		const [validator] = modules[0].functions;

		expect(validator).toMatchObject({
			name: "validateRecursiveObjectType",
			exported: true,
			expression: { kind: "object", name: "RecursiveObjectType" },
		});

		if (validator.expression.kind !== "object") throw new Error("Expected an object root");
		const children = validator.expression.properties.find(
			(property) => property.name === "children",
		);
		if (children?.expression.kind !== "array")
			throw new Error("Expected an array children property");

		// The recursive reference is the same node as the root, now carrying a
		// validator so it renders as a call back to itself.
		expect(children.expression.element).toBe(validator.expression);
		expect(children.expression.element.validator).toBe(validator);
	});

	test("imports a reused validator from the type's module", () => {
		const modules = compileSimpleType("CrossModuleReusedObjectType");

		const module1 = modules.find(
			(module) => module.modulePath === "lib/tsrc/__tests__/simpleTypes",
		);
		const module2 = modules.find(
			(module) => module.modulePath === "lib/tsrc/__tests__/externalObjectType",
		);

		if (!module1 || !module2) {
			throw new Error("Expected root and helper validator modules");
		}

		// The requested root stays in the module where its interface is declared.
		// Its imported helper uses the same local name as the helper's export.
		expect(module1.functions).toMatchObject([
			{
				name: "validateCrossModuleReusedObjectType",
				exported: true,
			},
		]);
		expect(module1.imports).toHaveLength(1);
		// The local name matches the export, so no alias is stored.
		expect(module1.imports[0]).toMatchObject({
			function: { name: "validateExternalObjectType", module: module2 },
		});
		expect(module1.imports[0].localName).toBeUndefined();

		// A helper used from another generated module must be public. Otherwise
		// the root module cannot import it.
		expect(module2.functions).toMatchObject([
			{
				name: "validateExternalObjectType",
				exported: true,
			},
		]);
	});

	test("compiles requested declarations from different modules once", () => {
		const decl1 = getSimpleTypeDeclaration("CrossModuleReusedObjectType");
		const decl2 = getExternalObjectTypeDeclaration();
		const modules = compileValidators(simpleTypesProgram, [decl1, decl2]);

		const module1 = modules.find(
			(module) => module.modulePath === "lib/tsrc/__tests__/simpleTypes",
		);
		const module2 = modules.find(
			(module) => module.modulePath === "lib/tsrc/__tests__/externalObjectType",
		);

		if (!module1 || !module2) {
			throw new Error("Expected root and helper validator modules");
		}

		// `ExternalObjectType` is both an explicitly requested declaration and a
		// reused dependency of the other root. It still produces one validator.
		expect(modules).toHaveLength(2);
		expect(module1.imports).toMatchObject([
			{ function: { name: "validateExternalObjectType", module: module2 } },
		]);
		expect(module1.imports[0].localName).toBeUndefined();
		expect(module2.functions).toMatchObject([
			{
				name: "validateExternalObjectType",
				exported: true,
			},
		]);
		expect(module2.functions).toHaveLength(1);
	});

	test("aliases imported validators that have conflicting names", () => {
		const modules = compileSimpleType("CollidingReusedObjectType");
		const rootModule = modules.find(
			(module) => module.modulePath === "lib/tsrc/__tests__/simpleTypes",
		);

		if (!rootModule) throw new Error("Expected root validator module");

		// The local `ObjectType` keeps `validateObjectType`.
		expect(rootModule.functions.map((validator) => validator.name)).toEqual([
			"validateObjectType",
			"validateCollidingReusedObjectType",
		]);

		// The two imported `validateObjectType` functions use the next free
		// names: `validateObjectType2` and `validateObjectType3`.
		expect(rootModule.imports).toMatchObject([
			{
				function: { name: "validateObjectType" },
				localName: "validateObjectType2",
			},
			{
				function: { name: "validateObjectType" },
				localName: "validateObjectType3",
			},
		]);
	});
});

/**
 * Compiles and checks one declaration from the shared focused example file.
 */
function expectExpression(name: string, expression: object): void {
	const modules = compileSimpleType(name);

	expect(modules[0].functions[0].expression).toMatchObject(expression);
}

/**
 * Compiles one declaration from the shared focused example file.
 */
function compileSimpleType(name: string) {
	const declaration = getSimpleTypeDeclaration(name);

	return compileValidators(simpleTypesProgram, [declaration]);
}

/**
 * Compiles the dedicated named-type reuse example.
 */
function compileNamedTypeFunctions() {
	return compileSimpleType("ReusedObjectType")[0].functions;
}
