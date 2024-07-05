import * as buildTimeConstants from "../lib/buildTimeConstants";

export const buildTimeConstantsObject = Object.fromEntries(
	Object.entries(buildTimeConstants).map(([key, value]) => [
		`__ADACTA.${key}`,
		typeof value === "function" ? `import("@/drizzle/migrations")` : JSON.stringify(value),
	])
);
