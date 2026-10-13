/**
 * Prints the message and ends the script with exit code 1.
 */
export function fail(message: string): never {
	console.error(message);
	process.exit(1);
}
