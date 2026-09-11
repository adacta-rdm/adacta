import { describe, expect, test } from "bun:test";
/**
 * Exercises the complete compiler-to-JavaScript boundary.
 *
 * These tests import the rendered JavaScript instead of matching source text.
 * They therefore check that the output is valid as an ES module and that its
 * exported functions perform the requested validation.
 */
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { getSimpleTypeDeclaration, simpleTypesProgram } from "~/lib/tsrc/__tests__/test-helpers";
import { ValidatorModule } from "~/lib/tsrc/src/ValidatorModule";
import { compileValidators } from "~/lib/tsrc/src/compileValidators";
import { renderValidatorModules } from "~/lib/tsrc/src/renderValidatorModules";

const execFileAsync = promisify(execFile);

/** Project-relative path of the fixture module that declares the test types. */
const simpleTypesModule = "lib/tsrc/__tests__/simpleTypes.js";

describe("renderValidatorModules", () => {
	describe("renders each type kind", () => {
		// Each named type compiles to one module. Its rendered contents are the
		// exported root validator plus any private helper, so snapshotting the module
		// covers every type kind that `renderValidatorModules` can emit.
		test.each([
			"TextType",
			"NumberType",
			"BooleanType",
			"NullType",
			"UndefinedType",
			"NeverType",
			"StringLiteralType",
			"NumberLiteralType",
			"TrueLiteralType",
			"FalseLiteralType",
			"UnionType",
			"ArrayType",
			"UnionArrayType",
			"ObjectType",
			"ComposedObjectType",
			"ComposedObjectTypeWithGeneric",
			"OptionalObjectType",
			"EmptyObjectType",
			"StringIndexObjectType",
			"ObjectWithIndexType",
			"IntersectionObjectType",
			"IndexIntersectionType",
			"TupleType",
			"OptionalTupleType",
			"RestTupleType",
			"SuffixRestTupleType",
		])("renders %s", (name) => {
			const modules = compileType(name);

			expect(modules).toHaveLength(1);
			expect(renderValidatorModules(modules)[0].contents).toMatchSnapshot();
		});
	});

	test("exports a working root validator with a reused local helper", async () => {
		// `ReusedObjectType` contains three `ObjectType` properties. Compiling it
		// should export the requested root and keep the reused validator private.
		const modules = compileType("ReusedObjectType");
		const [output] = renderValidatorModules(modules);

		expect(output.contents).toMatchInlineSnapshot(`
			"function validateObjectType(arg) {
				return typeof arg === "object" && arg !== null && (typeof arg["value"] === "string") && Object.keys(arg).every((key) => (["value"].includes(key)));
			}
			export function validateReusedObjectType(arg) {
				return typeof arg === "object" && arg !== null && (validateObjectType(arg["first"])) && (validateObjectType(arg["second"])) && (validateObjectType(arg["third"])) && Object.keys(arg).every((key) => (["first","second","third"].includes(key)));
			}
			export function isReusedObjectType(arg) {
				return validateReusedObjectType(arg);
			}
			export function assertReusedObjectType(arg) {
				if (validateReusedObjectType(arg)) return;
				throw new Error("Cannot convert to type ReusedObjectType");
			}
			export function castReusedObjectType(arg) {
				assertReusedObjectType(arg);
				return arg;
			}"
		`);

		// A source module keeps its project-relative path and changes its extension
		// to `.js` in the generated output directory.
		expect(output.relativePath).toBe(simpleTypesModule);

		const exports = await loadModule(output.contents);
		const validateReusedObjectType = exportedFunction(exports, "validateReusedObjectType");

		// The helper exists inside the generated module but is not part of its
		// public API. The root exercises it through all three reused properties.
		expect(exports.validateObjectType).toBeUndefined();
		expect(
			validateReusedObjectType({
				first: { value: "a" },
				second: { value: "b" },
				third: { value: "c" },
			}),
		).toBe(true);
		expect(
			validateReusedObjectType({
				first: { value: "a" },
				second: { value: 1 },
				third: { value: "c" },
			}),
		).toBe(false);
	});

	test("calls the reused validator from the root validator", async () => {
		// Force the reused helper to reject. Valid input then fails only if the
		// exported root actually calls the helper instead of inlining its checks.
		const modules = withRejectingValidator(compileType("ReusedObjectType"), "validateObjectType");
		const [output] = renderValidatorModules(modules);
		const exports = await loadModule(output.contents);
		const validateReusedObjectType = exportedFunction(exports, "validateReusedObjectType");

		// The private helper cannot be called through the module namespace. Its
		// forced rejection is observable only if the exported root calls it.
		expect(exports.validateObjectType).toBeUndefined();
		expect(
			validateReusedObjectType({
				first: { value: "a" },
				second: { value: "b" },
				third: { value: "c" },
			}),
		).toBe(false);
	});

	test("calls a reused validator imported from its source module", async () => {
		// Force the helper to reject. Valid input then fails only when the root
		// calls the helper imported from the other generated module.
		const modules = withRejectingValidator(
			compileType("CrossModuleReusedObjectType"),
			"validateExternalObjectType",
		);

		const outputs = renderValidatorModules(modules);
		const exports = await loadProjectModule(outputs, simpleTypesModule);
		const validate = exportedFunction(exports, "validateCrossModuleReusedObjectType");

		expect(
			validate({
				first: { value: "a" },
				second: { value: "b" },
			}),
		).toBe(false);
	});

	test("calls aliased validators with conflicting names", async () => {
		const modules = compileType("CollidingReusedObjectType");
		const outputs = renderValidatorModules(modules);
		const exports = await loadProjectModule(outputs, simpleTypesModule);
		const validate = exportedFunction(exports, "validateCollidingReusedObjectType");

		// String fields and number fields pass only when each alias calls the
		// validator from its own fixture module.
		expect(
			validate({
				local1: { value: "a" },
				local2: { value: "b" },
				string1: { value: "c" },
				string2: { value: "d" },
				number1: { value: 1 },
				number2: { value: 2 },
			}),
		).toBe(true);
	});
});

/**
 * Compiles one named fixture type into its generated validator modules.
 */
function compileType(typeName: string): readonly ValidatorModule[] {
	const declaration = getSimpleTypeDeclaration(typeName);
	return compileValidators(simpleTypesProgram, [declaration]);
}

/**
 * Returns a copy of `modules` in which one named validator always rejects.
 *
 * The tests use this to prove that a root validator really *calls* a helper
 * instead of inlining an equivalent check. Once the helper body is `reject`,
 * previously valid input fails only when the root delegates to that helper. If
 * the root had inlined the checks, the same input would still pass.
 *
 * The copy is structural, so the original compiler output stays available for
 * other assertions in the same test. Each module is rebuilt with its imports
 * carried over; only the target validator's `expression` is swapped.
 */
function withRejectingValidator(
	modules: readonly ValidatorModule[],
	validatorName: string,
): ValidatorModule[] {
	const clones = new Map<string, ValidatorModule>();

	// First rebuild each module's functions so cross-module imports have a target.
	for (const module of modules) {
		const clone = new ValidatorModule(module.modulePath);
		clones.set(module.modulePath, clone);

		for (const validator of module.functions) {
			const expression =
				validator.name === validatorName ? { kind: "reject" as const } : validator.expression;
			// declareFunction adds the `validate` prefix, so strip it first.
			const typeName = validator.name.replace(/^validate/, "");
			clone.declareFunction(typeName, expression, validator.exported);
		}
	}

	// Re-add imports so each alias is recomputed exactly as in the original.
	for (const module of modules) {
		const clone = clones.get(module.modulePath)!;

		for (const validatorImport of module.imports) {
			const source = clones.get(validatorImport.function.module.modulePath)!;
			const called = source.functions.find((fn) => fn.name === validatorImport.function.name)!;
			clone.importValidator(called);
		}
	}

	return [...clones.values()];
}

async function loadModule(contents: string): Promise<Record<string, unknown>> {
	return loadProjectModule([{ relativePath: "validator.js", contents }], "validator.js");
}

/**
 * Writes all generated files to one temporary project and imports its root.
 *
 * Real files let Node resolve the root's relative helper import. For example,
 * `simpleTypes.js` can import `./externalObjectType.js`.
 */
async function loadProjectModule(
	outputs: readonly { relativePath: string; contents: string }[],
	rootPath: string,
): Promise<Record<string, unknown>> {
	const directory = await mkdtemp(join(tmpdir(), "tsrc-render-"));

	try {
		await writeFile(join(directory, "package.json"), '{"type":"module"}');

		for (const output of outputs) {
			const filename = join(directory, output.relativePath);
			await mkdir(dirname(filename), { recursive: true });
			await writeFile(filename, output.contents);
		}

		// A child process uses the runtime's standard ESM resolver. It rejects
		// `import "./helper"` when only `helper.js` exists.
		await execFileAsync(process.execPath, [join(directory, rootPath)]);

		const loaded: unknown = await import(pathToFileURL(join(directory, rootPath)).href);
		if (typeof loaded !== "object" || loaded === null) {
			throw new Error("Generated validator module did not load");
		}

		return loaded as Record<string, unknown>;
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}

/**
 * Returns one named export as a callable function or reports a broken module.
 */
function exportedFunction(
	exports: Record<string, unknown>,
	name: string,
): (...args: unknown[]) => unknown {
	const exported = exports[name];
	if (typeof exported !== "function") {
		throw new Error(`Generated validator module does not export '${name}'`);
	}

	return exported as (...args: unknown[]) => unknown;
}
