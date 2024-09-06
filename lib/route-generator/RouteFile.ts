import { parse, normalize, join } from "node:path";

import type { Tagged } from "type-fest";
import ts, { SyntaxKind } from "typescript";

export type TypeLiteralText = Tagged<string, "ts.TypeLiteralNode">;

export class RouteFile {
	constructor(public readonly filename: string, public readonly fileContents: string) {
		this.sourceFile = ts.createSourceFile(filename, fileContents, ts.ScriptTarget.Latest);

		// Extract the nodes from the source file needed for further processing
		for (const statement of this.sourceFile.statements) {
			if (
				ts.isImportDeclaration(statement) &&
				statement.importClause?.namedBindings &&
				ts.isNamedImports(statement.importClause.namedBindings) &&
				statement.importClause.namedBindings.elements.some((element) => {
					const t = (element.propertyName ?? element.name).text;
					return t === "GetDataArgs" || t === "Props" || t === "PropsWithChildren";
				})
			) {
				this.importFromGeneratedModuleNodeCandidates.push(statement);
			} else if (ts.isFunctionDeclaration(statement)) {
				if (statement.name && statement.name.getText(this.sourceFile) === "getData") {
					this.getDataFunctionNode = statement;
					this.declarations.getData = true;
				} else if (
					statement.name &&
					statement.name.getText(this.sourceFile) === "LoadingState" &&
					hasExportModifier(statement)
				) {
					this.declarations.LoadingState = true;
				} else if (
					statement.modifiers?.at(0)?.kind === SyntaxKind.ExportKeyword &&
					statement.modifiers?.at(1)?.kind === SyntaxKind.DefaultKeyword
				) {
					this.declarations.default = true;
				}
			} else if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
				if (
					statement.declarationList.declarations.some(
						(declaration) => declaration.name.getText(this.sourceFile) === "getData"
					)
				) {
					this.getDataFunctionNode = statement;
					this.declarations.getData = true;
				} else if (
					statement.declarationList.declarations.some(
						(declaration) => declaration.name.getText(this.sourceFile) === "redirect"
					)
				) {
					this.declarations.redirect = true;
				} else if (
					statement.declarationList.declarations.some(
						(declaration) => declaration.name.getText(this.sourceFile) === "LoadingState"
					)
				) {
					this.declarations.LoadingState = true;
				}
			} else if (
				ts.isTypeAliasDeclaration(statement) &&
				statement.name.text === "QueryParams" &&
				ts.isTypeLiteralNode(statement.type) &&
				hasExportModifier(statement)
			) {
				this.declarations.QueryParams = true;
				this.queryParamsNode = statement.type;
			}
		}
	}

	getDataFunctionNode;

	/**
	 * Returns the file contents with the following modifications:
	 * - All import statements are rewritten to use the `~/apps/desktop-app/src/routes` prefix
	 * - All export modifiers are removed, except for the `getData` function which is explicitly
	 *   exported
	 */
	getFileWithExportedGetDataFunction() {
		const lines = [];

		for (const statement of this.sourceFile.statements) {
			let text = statement.getText(this.sourceFile);

			if (ts.isImportDeclaration(statement)) {
				// The call to `slice` removes the quotes around the module specifier
				let moduleSpecifier = statement.moduleSpecifier.getText(this.sourceFile).slice(1, -1);
				// Rewrite relative imports
				if (moduleSpecifier.startsWith("./") || moduleSpecifier.startsWith("../")) {
					moduleSpecifier = join("~/apps/desktop-app/src/routes", moduleSpecifier);
					text = text.replace(
						statement.moduleSpecifier.getText(this.sourceFile),
						`"${moduleSpecifier}"`
					);
				}

				lines.push(text);
			} else if (statement === this.getDataFunctionNode) {
				// Make sure the getData function is exported
				if (!text.startsWith("export")) text = `export ${text}`;
				lines.push(text);
			} else {
				// We still include everything else in the file because we don't know if the getData function relies on other
				// functions or variables in the file, but remove the export modifier so we can rely on the bundler to remove
				// unused code
				if (text.startsWith("export default")) text = text.slice("export default".length);
				if (text.startsWith("export")) text = text.slice("export".length);
				lines.push(text);
			}
		}

		return lines.join("\n");
	}

	/**
	 * Which special declarations are present in the file.
	 */
	public readonly declarations = {
		QueryParams: false,
		getData: false,
		redirect: false,
		default: false,
		LoadingState: false,
	};

	/**
	 * Nodes of the import statements that potentially import types from a generated module.
	 *
	 * Candidates are import statements that import the `GetDataArgs`, `Props` or `PropsWithChildren` types. To finally
	 * determine which of these nodes are the correct ones, the path of the generated module needs to be known. This is
	 * passed to the `getFileWithUpdatedImports` method as the `prefix` parameter.
	 */
	private importFromGeneratedModuleNodeCandidates: ts.ImportDeclaration[] = [];

	private sourceFile: ts.SourceFile;

	private queryParamsNode: ts.TypeLiteralNode | undefined;

	/**
	 * Returns the module name for the route file. The module name is derived from the file name without the extension.
	 * An optional prefix can be provided to prepend to the module name, useful for import statements.
	 *
	 * Example:
	 * - `path/to/repositories.$repositoryId._index.tsx` becomes `repositories.$repositoryId._index`
	 */
	getModuleName(prefix?: string) {
		const moduleName = parse(this.filename).name;

		if (prefix) return normalize(`${prefix}/${moduleName}`);

		return moduleName;
	}

	/**
	 * Returns the route string as used within the application, i.e. a path-like string that represents the route.
	 *
	 * The route is derived from the filename as follows:
	 * - The file name without the extension is used as the route
	 * - Dots in the filename become slashes
	 * - Variables are denoted by a $ and are replaced with a colon
	 * - The index route ends with a slash
	 *
	 * Example:
	 * - `_index.tsx` becomes `/`
	 * - `repositories.$repositoryId._index.tsx` becomes `/repositories/:repositoryId/`
	 */
	getRouteName() {
		return (
			// eslint-disable-next-line prefer-template
			"/" +
			// The file name without the extension is used as the route
			this.getModuleName()
				.replaceAll(".", "/")
				// Variables are denoted by a $ and are replaced with a colon
				.replaceAll("$", ":")
				// The index route ends with a slash
				.replaceAll("_index", "")
		);
	}

	/**
	 * Returns an array of parameter names for the route.
	 *
	 * Parameters are dynamic parts of the route that are denoted by a colon.
	 */
	getParams(): string[] {
		return this.getRouteName()

			.split("/")
			.filter((part) => part[0] === ":")
			.map((part) => part.slice(1));
	}

	/**
	 * Returns whether the route has parameters.
	 */
	hasParams(): boolean {
		return this.getParams().length > 0;
	}

	getParamsTypeText(): TypeLiteralText {
		const params = this.getParams();
		if (params.length === 0) return "Record<string, never>" as TypeLiteralText;

		const propertyText = params.map((name) => `${name}: string`).join("; ");

		return `{ ${propertyText} }` as TypeLiteralText;
	}

	/**
	 * Returns the query parameters for the route in form of an object, where the key is the parameter name and the value
	 * is a boolean indicating whether the parameter is of type string or not.
	 *
	 * Query parameters are defined in the route file by exporting a type named `QueryParams`.
	 */
	getQueryParams(): { [key: string]: boolean } {
		if (!this.queryParamsNode) return {};

		const result: { [key: string]: boolean } = {};

		for (const property of this.queryParamsNode.members) {
			if (ts.isPropertySignature(property)) {
				const name = property.name.getText(this.sourceFile);
				const type = property.type?.getText(this.sourceFile);
				result[name] = type === "string";
			}
		}

		return result;
	}

	getQueryParamsTypeText(): TypeLiteralText {
		if (!this.queryParamsNode) return "Record<string, never>" as TypeLiteralText;
		return this.queryParamsNode.getText(this.sourceFile) as TypeLiteralText;
	}

	/**
	 * Returns whether this route is a nested route of the given route.
	 *
	 * Used to generate the type information for the route parameters, since a parent route can also access the parameters
	 * of its children.
	 */
	isNestedRouteOf(other: RouteFile): boolean {
		const thisName = this.getRouteName();
		const otherName = other.getRouteName();

		return thisName.startsWith(otherName);
	}

	/**
	 * Returns the file contents with updated import statements.
	 *
	 * Touches only import statements from the generated types file.
	 */
	getFileWithUpdatedImports(prefix: string): string {
		let fileContents = "";
		let start = 0;
		for (const importNode of this.importFromGeneratedModuleNodeCandidates) {
			// The call to `slice` removes the quotes around the module specifier
			const moduleSpecifier = importNode.moduleSpecifier.getText(this.sourceFile).slice(1, -1);
			if (!moduleSpecifier.startsWith(prefix)) continue;

			fileContents = fileContents.concat(
				this.fileContents.slice(start, importNode.moduleSpecifier.getStart(this.sourceFile)),
				`"${this.getModuleName(prefix)}"`
			);

			start = importNode.moduleSpecifier.getEnd();
		}

		return fileContents.concat(this.fileContents.slice(start));
	}
}

function hasExportModifier<T extends { modifiers?: ts.NodeArray<ts.ModifierLike> }>(
	node: T
): boolean {
	if (!node.modifiers) return false;
	return node.modifiers.some((modifier) => modifier.kind === SyntaxKind.ExportKeyword);
}
