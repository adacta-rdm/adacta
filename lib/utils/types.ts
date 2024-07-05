import type { ValueOf } from "type-fest";
import type { BuiltIns } from "type-fest/source/internal";

import type { IIdTypeMap } from "../database/Ids";

import type { DrizzleEntity, DrizzleEntityNameId } from "~/drizzle/DrizzleSchema";

type Typename<T extends { __typename?: any }> = Exclude<T["__typename"], undefined>;

export type ResolverReturnType<T> = T extends BuiltIns
	? T
	: T extends (...args: any[]) => unknown
	? T | undefined
	: T extends object
	? T extends Array<infer ItemType> // Test for arrays/tuples, per https://github.com/microsoft/TypeScript/issues/35156
		? ItemType[] extends T // Test for arrays (non-tuples) specifically
			? Array<ResolverReturnType<ItemType>>
			: ResolverReturnTypeObject<T> // Tuples behave properly
		: ResolverReturnTypeObject<T>
	: unknown;

/**
 * Internal helper for `ResolverReturnType`.
 */
type ResolverReturnTypeObject<T extends object> = T extends { id: string }
	? ResolverReturnType<Omit<T, "id">> & { id: StronglyTypedId<T> }
	: {
			[KeyType in keyof T]?: ResolverReturnType<T[KeyType]>;
	  };

/**
 * Helper type to find the matching ID type for a given GraphQL type based on finding a CouchDB with
 * the same "type" property
 */
type FindMatchingIdType<T extends { id: string; __typename?: DrizzleEntityNameId }> = DrizzleEntity<
	Typename<T>
>["id"];

/**
 * Resolver type for GraphQL type "Node"
 *
 * Note: In theory this type is a little bit broader than it should be. It allows types which don't
 * exist in some contexts (e.g. a "IRepositorySettingId" in the repo-server). However, this should
 * not be a big issue since it should not be possible to get IDs of the wrong types in these
 * contexts (no query in the repo-server should be able to return a "IRepositorySettingId")
 */
type NodeResolver<T extends { id: string; __typename?: DrizzleEntityNameId }> =
	| FindMatchingIdType<T> // Automatically find the matching ID type for CouchDB documents
	| ValueOf<IIdTypeMap>; // Match all types registered in IIdTypeMap
//
/**
 * Internal helper for `ResolverReturnTypeObject`.
 */
type StronglyTypedId<T extends { id: string }> =
	// Match all types registered in IIdTypeMap (alias names or types not part of CouchDB)
	T extends { __typename?: keyof IIdTypeMap }
		? IIdTypeMap[Typename<T>]
		: // Match GraphQL type "Node"
		T extends { id: string; __typename?: undefined }
		? NodeResolver<T>
		: // Try to match nodes from CouchDB which are resolvable only by ID
		T extends { id: string; __typename?: DrizzleEntityNameId }
		? FindMatchingIdType<T>
		: T["id"];
