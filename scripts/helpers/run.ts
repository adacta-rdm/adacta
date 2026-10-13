/**
 * Runs a command in the working directory with the terminal as its input and
 * output. The environment of this script is passed on, with the given values
 * added. A failed command ends the script with the same exit code.
 */
export async function run(command: string[], env: Record<string, string> = {}): Promise<void> {
	const child = Bun.spawn(command, {
		env: { ...process.env, ...env },
		stdio: ["inherit", "inherit", "inherit"],
	});
	const exitCode = await child.exited;

	if (exitCode !== 0) {
		console.error(`${command.join(" ")} failed.`);
		process.exit(exitCode);
	}
}
