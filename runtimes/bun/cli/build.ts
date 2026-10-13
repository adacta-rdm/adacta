import { generate } from "~/runtimes/bun/cli/generate.ts";
import { run } from "~/scripts/helpers/run.ts";

/**
 * Builds the server and the static files into build/.
 */
export async function build(): Promise<void> {
	await generate();

	await run(["bun", "--bun", "react-router", "build"]);
}
