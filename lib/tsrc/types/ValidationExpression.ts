import type { ValidatorFunction } from "~/lib/tsrc/src/ValidatorModule";

/**
 * A value-independent runtime validation expression.
 *
 * Parent nodes decide which runtime value is supplied to each child. The graph
 * therefore contains validation semantics rather than generated JavaScript
 * paths or callback variable names.
 */
export type ValidationExpression =
	| AcceptExpression
	| RejectExpression
	| TypeofExpression
	| LiteralExpression
	| AndExpression
	| OrExpression
	| ArrayExpression
	| TupleExpression
	| ObjectExpression;

export interface NamedExpression {
	/**
	 * TODO: Examples for named and unnamed expressions
	 */
	name?: string;

	/**
	 * Identifies the validator function to be called in place of rendering this
	 * expression's checks.
	 *
	 * For example, an `ObjectType` expression without this property renders its
	 * object and property checks. Setting it to a call for
	 * `validateObjectType` renders:
	 *
	 * ```js
	 * validateObjectType(arg);
	 * ```
	 *
	 * The renderer ignores this property on a validator function's top
	 * expression, so its body still renders the complete checks.
	 */
	validator?: ValidatorFunction;
}

/**
 * Accepts every runtime value, as required for `any` and `unknown`.
 */
export interface AcceptExpression extends NamedExpression {
	readonly kind: "accept";
}

/**
 * Rejects every runtime value, as required for `never` and unrecognized types.
 */
export interface RejectExpression extends NamedExpression {
	readonly kind: "reject";
}

/**
 * Accepts values with the specified JavaScript primitive type.
 */
export interface TypeofExpression extends NamedExpression {
	readonly kind: "typeof";
	readonly type: "boolean" | "number" | "string";
}

/**
 * Accepts only the represented literal value.
 */
export interface LiteralExpression extends NamedExpression {
	readonly kind: "literal";
	readonly value: boolean | number | string | null | undefined;
}

/**
 * Accepts a value when every child expression accepts that value.
 */
export interface AndExpression extends NamedExpression {
	readonly kind: "and";
	readonly expressions: readonly ValidationExpression[];
}

/**
 * Accepts a value when at least one child expression accepts that value.
 */
export interface OrExpression extends NamedExpression {
	readonly kind: "or";
	readonly expressions: readonly ValidationExpression[];
}

/**
 * Accepts arrays whose elements all satisfy the element expression.
 */
export interface ArrayExpression extends NamedExpression {
	readonly kind: "array";
	readonly element: ValidationExpression;
}

/**
 * Accepts tuples such as `[string, number?]` and `[string, ...number[]]`.
 *
 * In `[string, ...number[], boolean]`, the rest entry stays between both required entries.
 */
export interface TupleExpression extends NamedExpression {
	readonly kind: "tuple";
	readonly elements: readonly TupleElementExpression[];
}

/**
 * `required`, `optional`, and `rest` represent `string`, `number?`, and `...boolean[]`.
 */
export interface TupleElementExpression extends NamedExpression {
	readonly kind: "required" | "optional" | "rest";
	readonly expression: ValidationExpression;
}

/**
 * Accepts non-null, non-array objects with the declared property constraints.
 *
 * A string index expression permits additional keys and validates every object
 * value. Without one, keys not present in `properties` are rejected.
 */
export interface ObjectExpression extends NamedExpression {
	readonly kind: "object";

	readonly properties: PropertyExpression[];
	stringIndex?: ValidationExpression;
}

/**
 * Describes one named object property and whether it may be absent.
 */
export interface PropertyExpression extends NamedExpression {
	readonly expression: ValidationExpression;
	readonly name: string;

	readonly optional: boolean;
}
