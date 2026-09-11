import { describe, expect, test } from "bun:test";

import { getSimpleTypeDeclaration } from "~/lib/tsrc/__tests__/test-helpers";
import { compileAmbientDeclarations } from "~/lib/tsrc/src/compileAmbientDeclarations";
import type { ModulePath } from "~/lib/tsrc/types/ModulePath";
import type { ProjectScan } from "~/lib/tsrc/types/ProjectScan";

describe("compileAmbientDeclarations", () => {
	test("renders declarations from the scanned project", () => {
		const modulePath = "lib/tsrc/__tests__/simpleTypes" as ModulePath;
		const project: ProjectScan = {
			declarationsByModule: new Map([[modulePath, [getSimpleTypeDeclaration("ObjectType")]]]),
			requestedModules: new Set(),
		};

		expect(compileAmbientDeclarations(project, "@/tsrc")).toEqual({
			relativePath: "index.d.ts",
			contents: `
declare module "@/tsrc/lib/tsrc/__tests__/simpleTypes" {
	import type { Jsonify } from "type-fest";
	import type { ObjectType } from "~/lib/tsrc/__tests__/simpleTypes";

	export function isObjectType(arg: unknown): arg is Jsonify<ObjectType>;
	export function assertObjectType(arg: unknown): asserts arg is Jsonify<ObjectType>;
	export function castObjectType(arg: unknown): Jsonify<ObjectType>;
}`,
		});
	});
});
