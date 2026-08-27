/**
 * Scaffolding test. It gives tsc, oxlint and bun test a file to work on so the
 * CI pipeline is meaningful before any application code exists.
 *
 * Delete this once real tests land.
 */
import { expect, test } from "bun:test";

test("the toolchain runs", () => {
	expect(1 + 1).toBe(2);
});
