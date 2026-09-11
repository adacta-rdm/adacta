/**
 * Compiles TypeScript declarations into `ValidatorModule` values.
 *
 * Target behavior: a named object type used more than once by one root
 * validator produces one validator function in the module that declares the
 * type. For example:
 *
 * ```ts
 * interface ObjectType {
 *   value: string;
 * }
 *
 * interface ReusedObjectType {
 *   first: ObjectType;
 *   second: ObjectType;
 *   third: ObjectType;
 * }
 * ```
 *
 * For this input, the returned module contains `validateReusedObjectType` and
 * one `validateObjectType` helper. The renderer writes calls equivalent to:
 *
 * ```js
 * validateObjectType(arg.first) &&
 *   validateObjectType(arg.second) &&
 *   validateObjectType(arg.third);
 * ```
 */
import ts from "typescript";

import { ProjectPaths } from "~/lib/tsrc/src/ProjectPaths";
import { ValidatorModule } from "~/lib/tsrc/src/ValidatorModule";
import type { Declaration } from "~/lib/tsrc/types/Declaration";
import type { ModulePath } from "~/lib/tsrc/types/ModulePath";
import type {
	ObjectExpression,
	TupleExpression,
	ValidationExpression,
} from "~/lib/tsrc/types/ValidationExpression";

/**
 * Narrows `type` after `isArrayType(type)` or `isTupleType(type)` succeeds.
 */
interface NarrowingTypeChecker extends ts.TypeChecker {
	isArrayType(type: ts.Type): type is ts.TypeReference;
	isTupleType(type: ts.Type): type is ts.TupleTypeReference;
}

/**
 * Built-in class types with no JSON form. They are structurally objects, so
 * without this list they would compile to an empty-object validator.
 *
 * The classes are matched by name, not by global symbol identity. A user type named
 * `Date` would also abort. Fine for the standard library; tighten to a
 * `lib.d.ts` source check if that ever collides.
 */
const NON_JSON_CLASSES = new Set([
	"Date",
	"Map",
	"Set",
	"WeakMap",
	"WeakSet",
	"RegExp",
	"Promise",
	"ArrayBuffer",
	"DataView",
]);

/**
 * Compiles requested declarations and validators for reused named types.
 *
 * @param nodes - The declaration nodes for which to generate validator functions. Use `scanProject` to get them.
 */
export function compileValidators(
	program: ts.Program,
	nodes: readonly Declaration[],
): readonly ValidatorModule[] {
	const checker = program.getTypeChecker() as NarrowingTypeChecker;
	const paths = new ProjectPaths(program.getCurrentDirectory());

	const expressions = new Map<ts.Type, ValidationExpression>();
	const modules = new Map<ModulePath, ValidatorModule>();

	// Types whose compilation has started but not finished. A reference to one of
	// these is a recursive cycle and must become a validator call.
	const inProgress = new Set<ts.Type>();

	for (const node of nodes) {
		const modulePath = paths.modulePath(node.getSourceFile());
		const module = validatorModule(modulePath);
		const symbol = checker.getSymbolAtLocation(node.name);
		if (!symbol) throw new Error(`No symbol for declaration ${node.name.text}`);
		const type = checker.getDeclaredTypeOfSymbol(symbol);

		const rootExpression = expression(type);

		// Keep the root linked to its function. The renderer ignores this
		// link only for the function's top expression.
		rootExpression.validator = module.declareRoot(symbol.getName(), rootExpression);
	}

	// Link after compilation so every reused validator already has an owner.
	for (const module of modules.values()) {
		for (const validator of module.functions) {
			linkExpression(module, validator.expression, true);
		}
	}

	return [...modules.values()];

	/**
	 * Returns the module path that declares a named interface or type alias.
	 *
	 * Library types declared in `.d.ts` files resolve to a mirrored path under the
	 * output tree, such as `node_modules/type-fest/source/basic`, so their
	 * validators are emitted in the corresponding generated module.
	 */
	function modulePathOfType(type: ts.Type): ModulePath | undefined {
		const symbol = type.aliasSymbol ?? type.getSymbol();
		const declaration = symbol
			?.getDeclarations()
			?.find(
				(declaration) =>
					ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration),
			);

		return declaration && paths.modulePath(declaration.getSourceFile());
	}

	/**
	 * Returns the one generated module for a source module path.
	 *
	 * Both requested roots and discovered helper validators use this, so
	 * `address.ts` always maps to the same generated `ValidatorModule`.
	 */
	function validatorModule(modulePath: ModulePath): ValidatorModule {
		let module = modules.get(modulePath);

		if (!module) {
			module = new ValidatorModule(modulePath);
			modules.set(modulePath, module);
		}

		return module;
	}

	/**
	 * Creates imports from validator calls that will actually be rendered.
	 *
	 * The top expression of a validator points back to that same validator. For
	 * example, `validateObjectType.expression.validator` is
	 * `validateObjectType`. Its body must render the object checks, not call
	 * itself recursively, so the root loop passes `inline = true` for that first
	 * expression. Recursive calls use the default `false`, because nested
	 * expressions with a validator render as calls.
	 *
	 * When a nested expression delegates to another validator, traversal stops
	 * there. Any calls inside that expression belong to the called validator's
	 * body and are linked when that function is visited separately.
	 *
	 * @param inline - Ignore the current expression's validator and inspect its
	 * checks. This is true only for a validator function's top expression.
	 */
	function linkExpression(
		module: ValidatorModule,
		expression: ValidationExpression,
		inline = false,
	): void {
		const called = expression.validator;

		if (called && !inline) {
			module.importValidator(called);

			// The called validator links its own children when its body is visited.
			return;
		}

		// No validator call replaces this expression, so inspect its children.
		switch (expression.kind) {
			case "and":
			case "or":
				for (const child of expression.expressions) linkExpression(module, child);
				return;

			case "array":
				linkExpression(module, expression.element);
				return;

			case "tuple":
				for (const element of expression.elements) {
					linkExpression(module, element.expression);
				}
				return;

			case "object":
				if (expression.stringIndex) linkExpression(module, expression.stringIndex);
				for (const property of expression.properties) {
					linkExpression(module, property.expression);
				}
				return;

			case "accept":
			case "reject":
			case "typeof":
			case "literal":
				return;
		}
	}

	function expression(type: ts.Type): ValidationExpression {
		const cached = expressions.get(type);

		if (cached) {
			// A reference to a type still being compiled is recursive. It must
			// become a validator call so the expression tree stays finite.
			// A repeated named object gets its own shared validator instead of
			// being inlined again.
			if (inProgress.has(type) || typeof cached.name === "string") promoteToValidator(type, cached);

			return cached;
		}

		// Seed a placeholder before compiling members so a recursive reference
		// resolves to this same node instead of starting another traversal. `expressionInner`
		// fills the placeholder in place, so references captured mid-compilation see
		// the finished node.
		const placeholder = { kind: "reject" } satisfies ValidationExpression;
		inProgress.add(type);
		expressions.set(type, placeholder);

		Object.assign(placeholder, expressionInner(type));
		inProgress.delete(type);

		return placeholder;
	}

	/**
	 * Removes the redundant undefined branch from an optional member.
	 * The object and tuple renderers already accept an absent optional value.
	 */
	function optionalExpression(type: ts.Type): ValidationExpression {
		const compiled = expression(type);
		if (compiled.kind !== "or") return compiled;

		const expressions = compiled.expressions.filter(
			(expression) => expression.kind !== "literal" || expression.value !== undefined,
		);

		if (expressions.length === 0) return { kind: "accept" };
		return expressions.length === 1 ? expressions[0] : { kind: "or", expressions };
	}

	/**
	 * Gives a named type its own validator function so a call replaces the inline
	 * checks. This both shares a reused type and breaks a recursive cycle.
	 *
	 * The validator belongs to the module that declares the type, whether that is
	 * a project module or a mirrored library module.
	 */
	function promoteToValidator(type: ts.Type, target: ValidationExpression): void {
		if (target.validator) return;

		// A cyclic reference reaches its type before the object build sets a name,
		// so fall back to the declared name.
		const name = target.name ?? namedTypeName(type);
		if (!name) return;

		const modulePath = modulePathOfType(type);
		if (!modulePath) return;

		target.name = name;
		target.validator = validatorModule(modulePath).declareFunction(name, target);
	}

	/**
	 * Returns the declared name of a named, non-generic interface or type alias.
	 *
	 * Generic instances share one symbol, so their names would collide. They are
	 * left unnamed and compiled inline.
	 */
	function namedTypeName(type: ts.Type): string | undefined {
		if (type.aliasTypeArguments?.length) return undefined;
		if ((type as ts.TypeReference).typeArguments?.length) return undefined;

		const symbol = type.aliasSymbol ?? type.getSymbol();
		const named = symbol
			?.getDeclarations()
			?.some(
				(declaration) =>
					ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration),
			);

		return named ? symbol?.getName() : undefined;
	}

	/**
	 * Compiles the validation behavior of one resolved TypeScript type.
	 *
	 * Kept separate from `expression` so its many early returns stay readable.
	 * `expression` wraps this with caching and reuse promotion.
	 */
	function expressionInner(type: ts.Type): ValidationExpression {
		const flags = type.flags;

		if (flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return { kind: "accept" };
		// `never` has no runtime value. Even `undefined` must be rejected.
		if (flags & ts.TypeFlags.Never) return { kind: "reject" };

		if (flags & ts.TypeFlags.Boolean) return { kind: "typeof", type: "boolean" };
		if (flags & ts.TypeFlags.Number) return { kind: "typeof", type: "number" };
		if (flags & ts.TypeFlags.String) return { kind: "typeof", type: "string" };
		if (flags & ts.TypeFlags.Null) return { kind: "literal", value: null };
		if (flags & ts.TypeFlags.Undefined) return { kind: "literal", value: undefined };

		// `bigint` and `symbol` have no JSON form, so a validator for them would
		// check a shape the input can never have. Abort instead.
		if (flags & (ts.TypeFlags.BigInt | ts.TypeFlags.BigIntLiteral | ts.TypeFlags.ESSymbol)) {
			unsupported(type);
		}

		if (flags & (ts.TypeFlags.StringLiteral | ts.TypeFlags.NumberLiteral)) {
			return {
				kind: "literal",
				value: (type as ts.StringLiteralType | ts.NumberLiteralType).value,
			};
		}

		if (flags & ts.TypeFlags.BooleanLiteral) {
			return {
				kind: "literal",
				value: (type as unknown as { intrinsicName: string }).intrinsicName === "true",
			};
		}

		if (type.isUnion()) {
			return {
				kind: "or",
				expressions: type.types.map((member) => expression(member)),
			};
		}

		if (type.isIntersection()) {
			// For `{ a: string } & { b: number }`, the TypeChecker returns `a` and `b`
			// as one property list. Compile that merged list as a single object shape.
			if (checker.getPropertiesOfType(type).length > 0) return objectExpression(type);

			// Intersections without named properties can still impose separate rules,
			// such as two index signatures. Retain every member and require all to pass.
			return {
				kind: "and",
				expressions: type.types.map((member) => expression(member)),
			};
		}

		if (checker.isArrayType(type)) {
			const [element] = checker.getTypeArguments(type);
			return { kind: "array", element: expression(element) };
		}

		if (checker.isTupleType(type)) {
			return tupleExpression(type);
		}

		// Arrays and other specific object forms also carry `TypeFlags.Object`.
		// Handle them before falling back to a generic object expression.
		if (flags & ts.TypeFlags.Object) return objectExpression(type);

		unsupported(type);
	}

	/**
	 * Aborts compilation for a type with no JSON form.
	 *
	 * TSRC validates JSON values only. Types like `bigint`, `symbol`, `Date`,
	 * `Map`, `Set`, and functions never survive `JSON.parse`/`stringify`, so a
	 * generated validator would check a shape the input can never have. Failing
	 * here prevents the generator from emitting an invalid validator.
	 */
	function unsupported(type: ts.Type): never {
		throw new Error(
			`TSRC cannot validate \`${checker.typeToString(type)}\`: it has no JSON form. ` +
				`Supported types are JSON values (string, number, boolean, null, objects, ` +
				`arrays, tuples, and unions of these). See lib/tsrc/README.md.`,
		);
	}

	/**
	 * Compiles resolved object properties and the optional string index.
	 */
	function objectExpression(type: ts.Type): ObjectExpression {
		// Functions and built-in classes are objects at the type level but carry
		// no JSON form. Abort rather than validate them as an empty shape.
		if (type.getCallSignatures().length > 0 || type.getConstructSignatures().length > 0) {
			unsupported(type);
		}

		const className = (type.aliasSymbol ?? type.getSymbol())?.getName();
		if (className && NON_JSON_CLASSES.has(className)) unsupported(type);

		const stringIndex = checker.getIndexTypeOfType(type, ts.IndexKind.String);

		return {
			kind: "object",
			name: objectTypeName(type),
			stringIndex: stringIndex && expression(stringIndex),
			properties: checker.getPropertiesOfType(type).map((property) => {
				const declaration = property.valueDeclaration ?? property.declarations?.[0];
				const propertyType = declaration
					? checker.getTypeOfSymbolAtLocation(property, declaration)
					: checker.getTypeOfSymbol(property);
				const optional = (property.flags & ts.SymbolFlags.Optional) !== 0;

				return {
					name: property.getName(),
					optional,
					expression: optional ? optionalExpression(propertyType) : expression(propertyType),
				};
			}),
		};
	}

	/**
	 * Names an object type for its validator function.
	 *
	 * A generic instance includes its type arguments in the name, so
	 * `Generic<string>` and `Generic<number>` read as distinct validators. The
	 * name is a readable label only; two arguments can still print the same (such
	 * as same-named interfaces from different files), so `declareFunction` keeps
	 * distinct types apart by suffix rather than relying on unique names here.
	 */
	function objectTypeName(type: ts.Type): string | undefined {
		const symbol = namedSymbol(type);
		if (!symbol) return undefined;

		const typeArguments = (type as ts.TypeReference).typeArguments ?? type.aliasTypeArguments;
		if (!typeArguments?.length) return symbol.getName();

		return symbol.getName() + typeArguments.map(typeArgumentName).join("");
	}

	/**
	 * Turns a type argument into an identifier fragment, such as `string` to
	 * `String` or `Foo | Bar` to `FooBar`.
	 */
	function typeArgumentName(type: ts.Type): string {
		return checker
			.typeToString(type)
			.split(/[^A-Za-z0-9]+/)
			.filter(Boolean)
			.map((part) => part[0].toUpperCase() + part.slice(1))
			.join("");
	}

	/**
	 * Compiles `[string, number?]` as ordered `required` and `optional` elements.
	 */
	function tupleExpression(type: ts.TupleTypeReference): TupleExpression {
		const elementTypes = checker.getTypeArguments(type);
		const target = type.target;

		return {
			kind: "tuple",
			// `[string, ...number[], boolean]` keeps `rest` between both required
			// elements. The renderer can therefore read positions from both ends.
			elements: elementTypes.map((elementType, index) => {
				const flags = target.elementFlags[index];
				const kind =
					flags & ts.ElementFlags.Optional
						? "optional"
						: flags & ts.ElementFlags.Variable
							? "rest"
							: "required";

				return {
					kind,
					expression:
						kind === "optional" ? optionalExpression(elementType) : expression(elementType),
				};
			}),
		};
	}
}

/**
 * Returns the symbol for a project-owned interface or type alias.
 */
function namedSymbol(type: ts.Type): ts.Symbol | undefined {
	// An alias identifies `type Alias = ...`; the type symbol identifies declarations
	// such as interfaces. Generic instances retain distinct `ts.Type` identities.
	const symbol = type.aliasSymbol ?? type.getSymbol();
	if (!symbol) return undefined;

	return symbol
		.getDeclarations()
		?.some(
			(declaration) =>
				(ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration)) &&
				!declaration.getSourceFile().isDeclarationFile,
		)
		? symbol
		: undefined;
}
