import { run } from "~/scripts/helpers/run.ts";

/**
 * Runs the test suite with Bun.
 */
export async function test(args: string[]): Promise<void> {
	await run(["bun", "test", ...args]);
}
