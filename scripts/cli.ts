import { cli } from "~runtime/cli.ts";

/**
 * Runs one command of the project.
 *
 *   bun scripts/cli.ts <command> [arguments]
 *
 * Each package script names one command. For example, `bun run seed:load
 * pilot` runs `bun scripts/cli.ts seed:load pilot`. This file checks the
 * arguments of the command and hands the work to the selected runtime.
 *
 * See runtimes/README.md.
 */
import { fail } from "~/scripts/helpers/fail.ts";
import { rebuildBaseline } from "~/scripts/helpers/rebuildBaseline.ts";
import { assertPresetExists } from "~/seed/seed.ts";

const [command, ...args] = process.argv.slice(2);

switch (command) {
	case "users:admin":
		await cli.usersAdmin(args);
		break;
	case "seed:load": {
		const [preset, ...extra] = args;
		if (extra.length > 0) fail("seed:load accepts one preset name.");
		if (import.meta.env.NODE_ENV === "production") fail("Refusing production environment.");
		assertPresetExists(preset ?? "demo");

		await cli.seedLoad(preset);
		break;
	}

	case "migrations:apply":
		acceptNoArguments();
		await cli.migrationsApply();
		break;

	// The baseline is built from the schema. It is the same for every runtime.
	case "migrations:baseline":
		acceptNoArguments();
		await rebuildBaseline();
		break;

	case "generate":
		acceptNoArguments();
		await cli.generate();
		break;

	// For example, `bun run dev --host` passes --host to the development server.
	case "dev":
		await cli.dev(args);
		break;

	case "build":
		acceptNoArguments();
		await cli.build();
		break;

	case "start":
		acceptNoArguments();
		await cli.start();
		break;

	// For example, `bun run test app/routes` runs only the route tests.
	case "test":
		await cli.test(args);
		break;

	default:
		fail(`Unknown command "${command}".`);
}

function acceptNoArguments(): void {
	if (args.length > 0) fail(`${command} accepts no arguments.`);
}
