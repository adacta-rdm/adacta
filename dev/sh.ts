import { exec, execSync } from "node:child_process";
import { promisify } from "node:util";

export const execAsync = promisify(exec);

export async function sh(cmd: string): Promise<string> {
	const { stdout } = await execAsync(cmd);
	return stdout;
}

/**
 * Executes `command` synchronously in a shell and returns the output as a string
 */
export function shSync(command: string, options: { cwd?: string } = { cwd: undefined }): string {
	return execSync(command, { encoding: "utf8", cwd: options.cwd });
}
