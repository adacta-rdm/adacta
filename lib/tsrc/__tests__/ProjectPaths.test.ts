import { describe, expect, test } from "bun:test";

import ts from "typescript";

import { ProjectPaths } from "~/lib/tsrc/src/ProjectPaths";

describe("ProjectPaths", () => {
	test("converts a source filename to a project module path", () => {
		const sourceFile = ts.createSourceFile(
			"/project/src/User.ts",
			"export interface User {}",
			ts.ScriptTarget.Latest,
		);

		expect(String(new ProjectPaths("/project").modulePath(sourceFile))).toBe("src/User");
	});

	test("extracts a module path from a generated import", () => {
		expect(
			String(new ProjectPaths("/project", "@/tsrc").generatedModulePath("@/tsrc/src/User")),
		).toBe("src/User");
	});
});
