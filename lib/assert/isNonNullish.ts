/**
 * Type guard that narrows the type of argument `t` to exclude `undefined` and `null`.
 */
export function isNonNullish<T>(t: T): t is Exclude<T, null | undefined> {
	return t !== undefined && t !== null;
}
