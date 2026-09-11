import type { Declaration } from "~/lib/tsrc/types/Declaration";
import type { ModulePath } from "~/lib/tsrc/types/ModulePath";
import type { OutputFile } from "~/lib/tsrc/types/OutputFile";
import type { ProjectScan } from "~/lib/tsrc/types/ProjectScan";

/**
 * Produces the ambient `index.d.ts` file that exposes TSRC functions to the
 * TypeScript compiler and editor tooling.
 *
 * Every eligible declaration is included, even when no source file currently
 * imports its generated module. This permits an editor to suggest
 * `is<Name>`, `assert<Name>`, and `cast<Name>` imports before a JavaScript
 * implementation has been requested.
 */
export function compileAmbientDeclarations(
	project: ProjectScan,
	virtualModuleName: string,
): OutputFile {
	let contents = "";
	// Program source-file order can vary with module resolution. Sorting only at
	// this rendering boundary keeps identical projects byte-stable.
	const modules = [...project.declarationsByModule].sort(([left], [right]) =>
		left.localeCompare(right),
	);
	for (const [modulePath, declarations] of modules) {
		contents += moduleDeclaration(virtualModuleName, modulePath, declarations);
	}
	return { relativePath: "index.d.ts", contents };
}

/**
 * Renders one ambient external module that mirrors a TypeScript source module.
 *
 * Imports remain inside the module declaration so editor auto-import discovery
 * associates the generated functions with their virtual module.
 */
function moduleDeclaration(
	virtualModuleName: string,
	modulePath: ModulePath,
	declarations: readonly Declaration[],
): string {
	const typeNames = declarations.map(declarationName);
	return `
declare module "${virtualModuleName}/${modulePath}" {
	import type { Jsonify } from "type-fest";
	import type { ${typeNames.join(", ")} } from "~/${modulePath}";
${declarations.map(functionDeclarations).join("\n")}
}`;
}

/**
 * Renders the public checks for one eligible source type.
 *
 * `Jsonify` describes the serialized runtime representation rather than class
 * instances or other source-only values.
 */
function functionDeclarations(declaration: Declaration): string {
	const typeName = declarationName(declaration);
	return `
	export function is${typeName}(arg: unknown): arg is Jsonify<${typeName}>;
	export function assert${typeName}(arg: unknown): asserts arg is Jsonify<${typeName}>;
	export function cast${typeName}(arg: unknown): Jsonify<${typeName}>;`;
}

function declarationName(declaration: Declaration): string {
	return declaration.name.text;
}
