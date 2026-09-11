import { fileURLToPath } from "node:url";

import ts from "typescript";

import type { Declaration } from "~/lib/tsrc/types/Declaration";

const simpleTypesFile = fileURLToPath(new URL("./simpleTypes.ts", import.meta.url));
const externalObjectTypeFile = fileURLToPath(new URL("./externalObjectType.ts", import.meta.url));

/**
 * Provides the shared TypeScript Program for the focused compiler examples.
 */
export const simpleTypesProgram = ts.createProgram([simpleTypesFile], {});

/**
 * Returns one named declaration from the shared focused example file.
 */
export function getSimpleTypeDeclaration(name: string): Declaration {
	return getTypeDeclaration(simpleTypesFile, name);
}

/**
 * Returns the declaration from the separate module used by import tests.
 */
export function getExternalObjectTypeDeclaration(): Declaration {
	return getTypeDeclaration(externalObjectTypeFile, "ExternalObjectType");
}

function getTypeDeclaration(fileName: string, name: string): Declaration {
	// Use the program's source file so the returned node belongs to its checker.
	const sourceFile = simpleTypesProgram.getSourceFile(fileName);
	if (!sourceFile) throw new Error(`Type source file '${fileName}' not found`);

	const declaration = sourceFile.statements.find(
		(statement) =>
			(ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) &&
			statement.name.text === name,
	);
	if (
		!declaration ||
		(!ts.isTypeAliasDeclaration(declaration) && !ts.isInterfaceDeclaration(declaration))
	) {
		throw new Error(`Simple type declaration '${name}' not found`);
	}
	return declaration;
}
