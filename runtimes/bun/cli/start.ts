import { migrationsApply } from "~/runtimes/bun/cli/migrationsApply.ts";
import { run } from "~/scripts/helpers/run.ts";

/**
 * Applies pending migrations and serves the build on PORT, or port 3000.
 */
export async function start(): Promise<void> {
	await migrationsApply();

	await run(["bun", "runtimes/bun/server.ts"]);
}
