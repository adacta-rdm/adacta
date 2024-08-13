import assert from "assert";

/**
 * Asserts that `obj` is instanceof `Class`
 */
export function assertInstanceof<T>(
	o: unknown,
	Class: new (...args: any[]) => T,
	msg?: string
): asserts o is T {
	assert(o instanceof Class, msg);
}
