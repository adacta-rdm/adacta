/**
 * The command-line operations of the Bun runtime. The alias ~runtime selects
 * this module for the commands in scripts/.
 */
import { build } from "~/runtimes/bun/cli/build.ts";
import { dev } from "~/runtimes/bun/cli/dev.ts";
import { generate } from "~/runtimes/bun/cli/generate.ts";
import { migrationsApply } from "~/runtimes/bun/cli/migrationsApply.ts";
import { seedLoad } from "~/runtimes/bun/cli/seedLoad.ts";
import { start } from "~/runtimes/bun/cli/start.ts";
import { test } from "~/runtimes/bun/cli/test.ts";

export const cli = {
	build,
	dev,
	generate,
	migrationsApply,
	seedLoad,
	start,
	test,
};
