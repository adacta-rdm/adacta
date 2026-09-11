import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { loadProgram } from "~/lib/tsrc/loadProgram";
import { scanProject } from "~/lib/tsrc/src/scanProject";

const fixtureDirectory = fileURLToPath(new URL("./fixtures/", import.meta.url));

describe("scanProject", () => {
	test("groups requested declarations by module", () => {
		const program = loadProgram(fixtureDirectory);
		const project = scanProject(program, "@/tsrc");

		const byModule = [...project.declarationsByModule].map(([modulePath, declarations]) => [
			String(modulePath),
			declarations.map((declaration) => declaration.name.text),
		]);

		expect(byModule).toEqual([
			["types", ["Test"]],
			["validatorImports", ["GenericWithExternalType"]],
		]);
		expect([...project.requestedModules].map(String)).toEqual(["types", "validatorImports"]);
	});

	test("reports a requested validator whose source module is missing", () => {
		const sourceFile = ts.createSourceFile(
			"/project/usage.ts",
			'import { isMissing } from "@/tsrc/missing";',
			ts.ScriptTarget.Latest,
		);
		// This narrow fake keeps the missing-module case independent from the
		// shared fixture project.
		const program = {
			getCurrentDirectory: () => "/project",
			getSourceFiles: () => [sourceFile],
			getSourceFile: () => undefined,
		} as unknown as ts.Program;

		expect(() => scanProject(program, "@/tsrc")).toThrow(
			"Cannot find source module 'missing' requested by 'isMissing'",
		);
	});
});
