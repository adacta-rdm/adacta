/**
 * Renders compiled validator modules as JavaScript output files.
 *
 * For example, a validator module named `lib/example` produces
 * `lib/example.js`. Rendering the complete module allows repeated expressions
 * to call their validator functions instead of being expanded inline.
 *
 * `renderValidatorModules` is the only entry point. The per-function and
 * per-expression renderers below are internal steps of one module render.
 */
import { dirname, relative } from "node:path/posix";

import type {
	RootValidator,
	ValidatorFunction,
	ValidatorImport,
	ValidatorModule,
} from "~/lib/tsrc/src/ValidatorModule";
import type { OutputFile } from "~/lib/tsrc/types/OutputFile";
import type {
	ObjectExpression,
	TupleExpression,
	ValidationExpression,
} from "~/lib/tsrc/types/ValidationExpression";

export function renderValidatorModules(modules: readonly ValidatorModule[]): readonly OutputFile[] {
	return modules.map((module) => ({
		relativePath: module.modulePath + ".js",
		// Imports must appear before functions that call them.
		contents: [
			...module.imports.map((validatorImport) => renderValidatorImport(module, validatorImport)),
			...module.functions.map((validator) => renderValidatorFunction(validator, module)),
			...module.roots.map(renderRootHelpers),
		].join("\n"),
	}));
}

/**
 * Renders the public `is`, `assert`, and `cast` helpers for one requested root.
 *
 * These are the functions the ambient declarations expose. Each wraps the
 * root's shared validator, which may carry a collision suffix in its name.
 */
function renderRootHelpers(root: RootValidator): string {
	const { typeName } = root;
	const validate = root.validator.name;

	return `export function is${typeName}(arg) {
	return ${validate}(arg);
}
export function assert${typeName}(arg) {
	if (${validate}(arg)) return;
	throw new Error("Cannot convert to type ${typeName}");
}
export function cast${typeName}(arg) {
	assert${typeName}(arg);
	return arg;
}`;
}

/**
 * Renders one import using paths relative to the generated caller module.
 *
 * For example, a validator in `models/order` importing one from
 * `models/address` uses `./address.js`. Importing `shared/address` instead uses
 * `../shared/address.js`.
 */
function renderValidatorImport(module: ValidatorModule, validatorImport: ValidatorImport): string {
	const relativeModulePath = relative(
		dirname(module.modulePath),
		validatorImport.function.module.modulePath,
	);

	// Node treats `address.js` as a package name. Generated local imports must
	// start with `./` or `../`, so add `./` for validators in the same directory.
	const importPath = relativeModulePath.startsWith(".")
		? relativeModulePath
		: `./${relativeModulePath}`;
	const exportedName = validatorImport.function.name;
	const importedName = validatorImport.localName
		? `${exportedName} as ${validatorImport.localName}`
		: exportedName;

	return `import { ${importedName} } from ${JSON.stringify(`${importPath}.js`)};`;
}

/**
 * Renders one compiled validator function as JavaScript source.
 */
function renderValidatorFunction(validator: ValidatorFunction, module: ValidatorModule): string {
	// Render the top expression inline to avoid `validateFoo` calling itself.
	const output = `function ${validator.name}(arg) {
	return ${renderExpression(validator.expression, "arg", module, true)};
}`;

	if (validator.exported) return `export ${output}`;

	return output;
}

function renderExpression(
	expr: ValidationExpression,
	arg: string,
	module: ValidatorModule,
	inline = false,
): string {
	if (expr.validator && !inline) {
		// Use the caller's alias. For example, an import of
		// `validateFoo as validateFoo2` must call `validateFoo2(arg)`.
		return `${module.localNameFor(expr.validator)}(${arg})`;
	}

	switch (expr.kind) {
		case "accept":
			return "true";
		case "reject":
			return "false";

		case "typeof":
			return `typeof ${arg} === "${expr.type}"`;

		case "literal":
			return `${arg} === ${JSON.stringify(expr.value)}`;

		case "array":
			return `Array.isArray(${arg}) && ${arg}.every((item) => (${renderExpression(
				expr.element,
				"item",
				module,
			)}))`;

		case "tuple":
			return renderTupleExpression(expr, arg, module);

		case "object":
			return renderObjectExpression(expr, arg, module);

		case "or":
			return expr.expressions.map((expr) => renderExpression(expr, arg, module)).join(" || ");

		case "and":
			return expr.expressions.map((expr) => renderExpression(expr, arg, module)).join(" && ");
	}

	throw new Error(`Unknown validation expression: ${JSON.stringify(expr satisfies never)}`);
}

/**
 * Counts from the start before a rest element and from the end after it.
 *
 * `[string, ...number[], boolean, Date]` uses `at(0)` for `string`, `at(-2)`
 * for `boolean`, `at(-1)` for `Date`, and `slice(1, arg.length - 2)` for the numbers.
 */
function renderTupleExpression(
	expr: TupleExpression,
	arg: string,
	module: ValidatorModule,
): string {
	const output = [`Array.isArray(${arg})`];

	const restIndex = expr.elements.findIndex((element) => element.kind === "rest");
	const requiredCount = expr.elements.filter((element) => element.kind === "required").length;

	if (requiredCount > 0) output.push(`${arg}.length >= ${requiredCount}`);
	if (restIndex === -1) output.push(`${arg}.length <= ${expr.elements.length}`);

	let referenceIndex = 0;
	for (const [index, element] of expr.elements.entries()) {
		if (element.kind === "rest") {
			// `[string, ...number[], boolean, Date]` has two trailing items: end at `arg.length - 2`.
			const trailingCount = expr.elements.length - restIndex - 1;
			output.push(
				`${arg}.slice(${restIndex}, ${arg}.length - ${trailingCount}).every((item) => (${renderExpression(
					expr.elements[restIndex].expression,
					"item",
					module,
				)}))`,
			);

			// In the same tuple, `boolean` switches to `at(2 - 4)`, or `at(-2)`.
			referenceIndex = expr.elements.length;
			continue;
		}

		const access = `${arg}.at(${index - referenceIndex})`;
		const check = renderExpression(element.expression, access, module);
		output.push(element.kind === "optional" ? `(${access} === undefined || ${check})` : check);
	}

	return output.join(" && ");
}

function renderObjectExpression(
	expr: ObjectExpression,
	arg: string,
	module: ValidatorModule,
): string {
	const output = [`typeof ${arg} === "object"`, `${arg} !== null`];

	output.push(
		...expr.properties.map((prop) => {
			const access = `${arg}[${JSON.stringify(prop.name)}]`;
			const rendered = `(${renderExpression(prop.expression, access, module)})`;
			return prop.optional ? `(${access} === undefined || ${rendered})` : rendered;
		}),
	);

	const propExpr = expr.stringIndex
		? renderExpression(expr.stringIndex, `${arg}[key]`, module)
		: `[${expr.properties.map((p) => JSON.stringify(p.name)).join(",")}].includes(key)`;

	output.push(`Object.keys(${arg}).every((key) => (${propExpr}))`);

	return output.join(" && ");
}
