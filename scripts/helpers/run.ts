import { Env } from "~/lib/env/Env.ts";

/**
 * Runs a command in the working directory with the terminal as its input and
 * output. The command inherits the environment of this script. The given
 * values are added and replace inherited values of the same name. For
 * example, `new Env({ NODE_ENV: "production" })` runs the command for
 * production. A failed command ends the script with the same exit code.
 */
export async function run(command: string[], env = new Env({})): Promise<void> {
	const inherited = { ...process.env };
	env.populate(inherited, true);

	const child = Bun.spawn(command, {
		env: inherited,
		stdio: ["inherit", "inherit", "inherit"],
	});
	const exitCode = await child.exited;

	if (exitCode !== 0) {
		console.error(`${command.join(" ")} failed.`);
		process.exit(exitCode);
	}
}
