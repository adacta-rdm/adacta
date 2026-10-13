import { run } from "~/scripts/helpers/run.ts";

/**
 * Generates the route types and the runtime validators.
 */
export async function generate(): Promise<void> {
	await run(["bun", "run", "typegen"]);
	await run(["bun", "run", "build:tsrc"]);
}
