import assert from "assert";

/**
 * Asserts that t is not undefined
 */
export function assertDefined<T>(t: T | undefined | null, msg?: string): asserts t is T {
	// Prevent 0 from triggering the assertion
	if (typeof t === "number") return;
	assert(t, msg);
}
