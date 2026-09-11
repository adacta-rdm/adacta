import ts from "typescript";

import { ProjectPaths } from "~/lib/tsrc/src/ProjectPaths";
import type { Declaration } from "~/lib/tsrc/types/Declaration";
import type { ModulePath } from "~/lib/tsrc/types/ModulePath";
import type { ProjectScan } from "~/lib/tsrc/types/ProjectScan";

/**
 * Identifies one source declaration requested through a generated validator import.
 */
interface ValidatorRequest {
	readonly moduleFilename: string;
	readonly modulePath: ModulePath;
	readonly declarationName: string;
}

/**
 * Finds the declarations whose generated validators the project imports.
 *
 * This scanner works from syntax only. It walks top-level
 * declarations and named `is`, `assert`, and `cast` imports of the virtual
 * module. It does not use the type checker, follow type references, or resolve
 * re-exports. A type-aware scan can replace it later without changing this contract.
 *
 * It returns the requested modules and, for each, the declarations it found.
 */
export function scanProject(
	program: ts.Program,
	virtualModuleName: string,
	ignoredPaths: readonly string[] = [],
): ProjectScan {
	const paths = new ProjectPaths(program.getCurrentDirectory(), virtualModuleName);
	const outputDirectory = paths.resolve(virtualModuleName);
	const resolvedIgnoredPaths = ignoredPaths.map((path) => paths.resolve(path));
	const requests: ValidatorRequest[] = [];
	const moduleFilenames = new Map<ModulePath, string>();
	const sourceFiles: ts.SourceFile[] = [];

	for (const sourceFile of program.getSourceFiles()) {
		if (sourceFile.fileName.includes("/node_modules/")) continue;
		if (sourceFile.fileName.startsWith(outputDirectory)) continue;
		if (resolvedIgnoredPaths.some((path) => sourceFile.fileName.startsWith(path))) continue;

		const modulePath = paths.modulePath(sourceFile);
		moduleFilenames.set(modulePath, sourceFile.fileName);
		sourceFiles.push(sourceFile);
	}

	for (const sourceFile of sourceFiles) {
		sourceFile.forEachChild((node) => {
			if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) return;

			const requestedModulePath = paths.generatedModulePath(node.moduleSpecifier.text);
			if (!requestedModulePath) return;

			const bindings = node.importClause?.namedBindings;
			if (!bindings || !ts.isNamedImports(bindings)) return;

			for (const element of bindings.elements) {
				// An aliased import retains the exported validator name in `propertyName`.
				const validatorName = (element.propertyName ?? element.name).text;
				const declarationName = declarationNameFromValidator(validatorName);
				if (!declarationName) continue;

				const moduleFilename = moduleFilenames.get(requestedModulePath);
				if (!moduleFilename) {
					throw new Error(
						`Cannot find source module '${requestedModulePath}' requested by '${validatorName}'`,
					);
				}

				requests.push({
					modulePath: requestedModulePath,
					declarationName,
					moduleFilename,
				});
			}
		});
	}

	// Several files or wrapper imports can request the same declaration, so
	// declarations are collected per module in a Set before being returned.
	const requestedModules = new Set<ModulePath>();
	const declarationsByModule = new Map<ModulePath, Set<Declaration>>();

	for (const request of requests) {
		requestedModules.add(request.modulePath);

		const sourceFile = program.getSourceFile(request.moduleFilename);
		if (!sourceFile) {
			throw new Error(
				`Source file '${request.moduleFilename}' for module '${request.modulePath}' is not in the Program`,
			);
		}

		sourceFile.forEachChild((node) => {
			if (!isDeclaration(node) || !isEligibleDeclaration(node)) return;
			if (node.name.text !== request.declarationName) return;

			let declarations = declarationsByModule.get(request.modulePath);
			if (!declarations) {
				declarations = new Set();
				declarationsByModule.set(request.modulePath, declarations);
			}

			declarations.add(node);
		});
	}

	return {
		declarationsByModule: new Map(
			[...declarationsByModule].map(([modulePath, declarations]) => [
				modulePath,
				[...declarations],
			]),
		),
		requestedModules,
	};
}

/**
 * Extracts the source declaration name from a generated validator name.
 */
function declarationNameFromValidator(validatorName: string): string | undefined {
	for (const prefix of ["is", "assert", "cast"] as const) {
		if (!validatorName.startsWith(prefix)) continue;
		const declarationName = validatorName.slice(prefix.length);
		return declarationName || undefined;
	}
	return undefined;
}

/**
 * Narrows an AST node to one of the declaration forms supported by TSRC.
 */
function isDeclaration(node: ts.Node): node is Declaration {
	return (
		ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)
	);
}

/**
 * Determines whether a declaration has a complete exported runtime shape.
 */
function isEligibleDeclaration(declaration: Declaration): boolean {
	const exported = declaration.modifiers?.some(
		(modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
	);
	if (!exported) return false;

	return !(
		"typeParameters" in declaration &&
		declaration.typeParameters &&
		declaration.typeParameters.length > 0
	);
}
