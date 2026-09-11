import type { ObjectType as ExternalNumberObjectType } from "./externalNumberObjectType";
import type { ExternalObjectType } from "./externalObjectType";
import type { ObjectType as ExternalStringObjectType } from "./externalStringObjectType";

export type TextType = string;
export type NumberType = number;
export type BooleanType = boolean;
export type NullType = null;
export type UndefinedType = undefined;
export type NeverType = never;
export type StringLiteralType = "text";
export type NumberLiteralType = 42;

// Non-JSON types. Compiling any of these must abort. See the "aborts on" tests.
export type BigIntType = bigint;
export type SymbolType = symbol;
export type BigIntLiteralType = 42n;
export type DateType = Date;
export type MapType = Map<string, number>;
export type FunctionType = () => void;
export type TrueLiteralType = true;
export type FalseLiteralType = false;
export type UnionType = string | number;
export type ArrayType = string[];
export type UnionArrayType = (string | number)[];

export interface ObjectType {
	value: string;
}

export interface ComposedObjectType {
	nested: ObjectType;
}

export interface ReusedObjectType {
	first: ObjectType;
	second: ObjectType;
	third: ObjectType;
}

// Reusing this external type creates one imported validator.
export interface CrossModuleReusedObjectType {
	first: ExternalObjectType;
	second: ExternalObjectType;
}

// These three `ObjectType` declarations force distinct local validator names.
export interface CollidingReusedObjectType {
	local1: ObjectType;
	local2: ObjectType;
	string1: ExternalStringObjectType;
	string2: ExternalStringObjectType;
	number1: ExternalNumberObjectType;
	number2: ExternalNumberObjectType;
}

interface Generic<T> {
	prop: T;
}

export interface ComposedObjectTypeWithGeneric {
	nestedString: Generic<string>;
	nestedNumber: Generic<number>;
}

// Each instantiation appears twice, so both are reused and promoted to their
// own validator. Their type arguments differ, so they get distinct names.
export interface CollidingGenericType {
	firstString: Generic<string>;
	secondString: Generic<string>;
	firstNumber: Generic<number>;
	secondNumber: Generic<number>;
}

// Two same-named `ObjectType` interfaces live in different files with different
// shapes. Both print as `ObjectType`, so `Generic<ExternalNumberObjectType>` and
// `Generic<ExternalStringObjectType>` both name to `GenericObjectType` and merge.
// This is the residual collision the naming scheme cannot resolve without
// qualifying or hashing the arguments.
export interface SameNameCollisionType {
	firstNumber: Generic<ExternalNumberObjectType>;
	secondNumber: Generic<ExternalNumberObjectType>;
	firstString: Generic<ExternalStringObjectType>;
	secondString: Generic<ExternalStringObjectType>;
}

export interface OptionalObjectType {
	value?: string;
}

export interface EmptyObjectType {}

export interface StringIndexObjectType {
	[key: string]: string;
}

export interface ObjectWithIndexType {
	a: number;
	[key: string]: string | number;
}

export type IntersectionObjectType = { a: string } & { b: number };

export type IndexIntersectionType = Record<string, string> & Record<string, number>;

export interface RecursiveObjectType {
	value: number;
	children: RecursiveObjectType[];
}

export type TupleType = [string, number];
export type OptionalTupleType = [string, number?];
export type RestTupleType = [string, ...number[]];
export type SuffixRestTupleType = [string, ...number[], boolean];
