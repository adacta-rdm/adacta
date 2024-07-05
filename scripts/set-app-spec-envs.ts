/**
 * This script transfers env variables from an env file to a DigitalOcean app spec file.
 *
 * Input arguments:
 * - The path to the env file.
 * - The path to the app spec file.
 *
 * All environment variables in the spec files are replaced with the values from the env file, but values in the app
 * spec file that do not exist in the env file are left unchanged. Also, the scope of the environment variables is
 * preserved.
 *
 * If the app spec file does not exist, then a new app spec file is created containing only the environment variables
 * from the env file.
 */
import { readFileSync, writeFileSync } from "node:fs";

import { parseEnvFile } from "~/lib/utils/parseEnvFile";

const args = process.argv.slice(2);
const envFile = args[0];
const specFile = args[1];

const env = parseEnvFile(readFileSync(envFile, "utf-8"));

const appSpec: { envs?: { key: string; value: string; scope: string }[] } = {};
try {
	Object.assign(appSpec, JSON.parse(readFileSync(specFile, "utf-8")));
	if (!appSpec.envs) appSpec.envs = [];
} catch (error: unknown) {
	if (error instanceof Error && "code" in error && error.code !== "ENOENT") throw error;
	appSpec.envs = [];
}

if (!Array.isArray(appSpec.envs)) {
	throw new Error("The envs property in the app spec file must be an array");
}

for (const [key, value] of Object.entries(env)) {
	const envVar = appSpec.envs.find((envVar) => envVar.key === key);
	if (envVar) {
		envVar.value = value;
	} else {
		appSpec.envs.push({ key, value, scope: "RUN_TIME" });
	}
}

writeFileSync(specFile, JSON.stringify(appSpec, null, "\t"));
