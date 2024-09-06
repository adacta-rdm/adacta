import { readFileSync } from "node:fs";

export function readRoutesForTesting<T extends string[]>(
	...routes: T
): { [K in T[number]]: string } {
	const output: Record<string, string> = {};

	for (const route of routes) {
		output[route] = readFileSync(`apps/desktop-app/src/routes/${route}`, "utf8");
	}

	return output as { [K in T[number]]: string };
}
