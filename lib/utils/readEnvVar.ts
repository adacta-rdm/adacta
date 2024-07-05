/**
 * Reads an environment variable and returns a default value if the environment variable is empty or
 * does not exist. When `defaultValue` is not specified, then an error is thrown.
 */
export function readEnvVar(
	envName: string,
	defaultValue?: string,
	warnAboutDefaultUsage = false
): string {
	const value = process.env[envName];

	if (value !== undefined && value.trim() !== "") {
		// Convert the \n character sequence to newlines
		return value.replace(/\\n/g, "\n");
	}

	if (defaultValue === undefined) {
		throw new Error(`Required environment variable "${envName}" is not defined or empty.`);
	}

	if (warnAboutDefaultUsage) {
		// eslint-disable-next-line no-console
		console.warn(`Environment variable ${envName} not found. Falling back to default`);
	}

	return defaultValue;
}
