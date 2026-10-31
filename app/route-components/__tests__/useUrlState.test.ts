import { describe, expect, test } from "bun:test";

import { Glob } from "bun";

describe("useUrlState", () => {
	test("is the only code that changes the query with the setter of useSearchParams", async () => {
		// A file that destructures a setter, as in `[params, setParams] =
		// useSearchParams()`, changes the query without useUrlState.
		const setter = /\[\s*\w+\s*,\s*\w+\s*\]\s*=\s*useSearchParams\(/;
		const files = new Glob("app/**/*.{ts,tsx}");

		const callers: string[] = [];
		for await (const file of files.scan(".")) {
			if (file.includes("__tests__") || file.endsWith("route-components/useUrlState.ts")) continue;
			if (setter.test(await Bun.file(file).text())) callers.push(file);
		}

		expect(callers).toEqual([]);
	});
});
