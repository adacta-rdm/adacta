function needsMerging(item: unknown): item is Record<string, unknown> {
	return item !== null && typeof item === "object" && !Array.isArray(item);
}

/**
 * Merges two objects with the same structure. The source object overwrites the target object.
 * Similar to deepMerge, but does not merge arrays, and overwrites target if source is undefined.
 *
 * Helper function to overcome the fact, that in graphql, for omitted variables the refetch function falls back to the ORIGINAL variable values.
 * This function is used to merge the original variables with the new variables, so that the refetch function uses the new variables.
 *
 * @example
 * const target = { foo: { bar: "baz" } };
 * const source = { foo: { qux: "quux" } };
 * const merged = deepMerge(target, source);
 * // { foo: { bar: "baz", qux: "quux" } }
 */
export function mergeGraphQLVariables<T extends Record<string, unknown>>(target: T, source: T): T {
	const output: Record<string, unknown> = { ...target };

	Object.keys(source).forEach((key) => {
		const targetValue = target[key];
		const sourceValue = source[key];
		if (needsMerging(targetValue) && needsMerging(sourceValue)) {
			output[key] = mergeGraphQLVariables(targetValue, sourceValue);
		} else {
			output[key] = sourceValue; // string, number, boolean, null, undefined, array
		}
	});

	return output as T;
}
