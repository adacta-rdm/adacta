import { generate } from "~/runtimes/bun/cli/generate.ts";
import { migrationsApply } from "~/runtimes/bun/cli/migrationsApply.ts";
import { run } from "~/scripts/helpers/run.ts";

/**
 * Applies pending migrations and starts the development server under Bun.
 */
export async function dev(args: string[]): Promise<void> {
	await migrationsApply();
	await generate();

	await run(["bun", "--bun", "react-router", "dev", ...args]);
}
