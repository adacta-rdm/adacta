import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { join } from "path";

import type { PathArg } from "@omegadot/fs";
import Ajv from "ajv";
import standalone from "ajv/dist/standalone";
import {
	type CompletedConfig,
	createFormatter,
	createParser,
	DEFAULT_CONFIG,
	SchemaGenerator,
} from "ts-json-schema-generator";
import type { Tagged } from "type-fest";
import ts, {
	type EnumDeclaration,
	type InterfaceDeclaration,
	type TypeAliasDeclaration,
} from "typescript";

import { GeneratedFilesReporter } from "~/scripts/utils/fileGenerator/GeneratedFilesReporter";
import { GENERATED_HEADER_TS } from "~/scripts/utils/fileGenerator/generatorConsts";
import { safeWriteGeneratedFile as safeWriteGeneratedFile_ } from "~/scripts/utils/fileGenerator/safeWriteGeneratedFile";

type ModulePath = Tagged<string, "ModulePath">;

type Declaration = InterfaceDeclaration | TypeAliasDeclaration | EnumDeclaration;

/**
 * TSRC (TypeScript Run-time Checks) is a tool that generates run time type checks for TypeScript types. The types are
 * defined as plain TypeScript type declarations in any of the source files of the project. You do not need any special
 * syntax to define types that are eligible for run time type checks.
 *
 * Three variants of run time type checks are generated for each type:
 * - `is<TypeName>`: A type guard function that checks whether the argument is of the type.
 * - `assert<TypeName>`: A type assertion function that asserts that the argument is of the type.
 * - `cast<TypeName>`: A type assertion function that casts the argument to the type.
 *
 * All generated functions internally use the same validation function. Which variant to use is a matter of preference.
 *
 * Code generation is divided into two steps. In the first step, TSRC scans the source files of the project for type
 * declarations that are eligible for run time type checks. These types are then used to generate ambient module
 * declarations as a means to provide hints to the editor that run time type checks are available for these types.
 * At this stage, TSRC does not generate any code that performs run time type checks.
 *
 * The second step involves generating the actual run time type checks. This is done by scanning the project's source
 * files for imports to the ambient module declarations generated in the first step. For each import, TSRC generates a
 *
 */
export class TSRC {
	/**
	 * The absolute path to the directory where generated files are written to.
	 */
	private readonly outDirectory: string;

	/**
	 * List of absolute paths of files to ignore.
	 */
	private ignore: string[];

	/**
	 * The virtual module from which the generated files can be imported from.
	 */
	private virtualModuleName: string;

	/**
	 * @param projectDirectory - Absolute path to the project directory.
	 * @param outDirectory - Directory relative to the project directory where generated files are written to. Specifying a path within `node_modules` breaks auto-imports in the IDE.
	 * @param ignore - List of paths relative to the project directory to ignore.
	 */
	constructor(
		private readonly projectDirectory: string,
		virtualModuleName: string,
		ignore: string[] = []
	) {
		// Interpret relative paths as being relative to projectDirectory.
		// Calling `resolve` has no effect if `ignorePath` is absolute, so it's safe to call it unconditionally.
		this.outDirectory = resolve(projectDirectory, virtualModuleName);
		this.ignore = ignore.map((path) => resolve(projectDirectory, path));
		this.virtualModuleName = virtualModuleName;

		const tsconfigPath = ts.findConfigFile(this.projectDirectory, ts.sys.fileExists);

		if (!tsconfigPath) {
			throw new Error("Could not find a valid 'tsconfig.json'.");
		}
		this.tsconfigPath = tsconfigPath;

		const result = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
		if (result.error) {
			throw new Error(result.error.messageText.toString());
		}

		this.tsconfig = ts.parseJsonConfigFileContent(result.config, ts.sys, projectDirectory);

		this.program = ts.createProgram(this.tsconfig.fileNames, this.tsconfig.options);
	}

	private ajv = new Ajv({
		allowUnionTypes: true,
		code: {
			// Add line breaks to generated code
			lines: true,
			source: true,
			esm: true,
			optimize: true,
		},
	});

	public readonly tsconfigPath: string;

	private tsconfig;

	public readonly reporter = new GeneratedFilesReporter();

	private program: ts.Program;

	processSourceFiles() {
		for (const sourceFile of this.program.getSourceFiles()) this.processSourceFile(sourceFile);
	}

	/**
	 * Traverses the AST of `sourceFile` for type declarations and imports, and extracts the types that are eligible for
	 * run time type checks.
	 */
	private processSourceFile(sourceFile: ts.SourceFile) {
		// Skip files in node_modules
		if (sourceFile.fileName.includes("/node_modules/")) return;
		// Skip files in the output directory
		if (sourceFile.fileName.startsWith(this.outDirectory)) return;

		for (const ignorePath of this.ignore) {
			if (sourceFile.fileName.startsWith(resolve(this.projectDirectory, ignorePath))) return;
		}

		const moduleName = this.moduleName(sourceFile);
		let types = this.typeDecl.get(moduleName);

		sourceFile.forEachChild((node) => {
			// Detect which declarations have been used
			if (ts.isImportDeclaration(node)) {
				// We only care about imports from the special virtual module
				// Get the module specifier without quotes
				const module = node.moduleSpecifier.getFullText(sourceFile).trim().slice(1, -1);
				// Append a slash to the virtual module name to avoid matching modules with a coincidental
				// common prefix
				if (!module.startsWith(`${this.virtualModuleName}/`)) return;
				// Omit imports declarations that don't import anything
				if (!node.importClause) return;

				// The call to `slice` removes virtual module prefix,
				// i.e. @vmodule/path/to/file.ts -> path/to/file.ts
				this.foundModules.add(module.slice(this.virtualModuleName.length + 1) as ModulePath);
			}
			// Gather all available declarations
			else if (
				ts.isInterfaceDeclaration(node) ||
				ts.isTypeAliasDeclaration(node) ||
				ts.isEnumDeclaration(node)
			) {
				// It only makes sense to take exported types into account.
				if (!node.modifiers) return;
				let exports = false;
				for (const m of node.modifiers) {
					if (m.kind === ts.SyntaxKind.ExportKeyword) {
						exports = true;
						break;
					}
				}
				if (!exports) return;

				// We can't generate a validation function for declarations with type parameters, i.e. generic types.
				// Instead, the user can declare a new alias type with the type parameter set.
				// Example:
				// type MyDict<T> = Record<string, T | undefined> // Does not work
				// type MyDictString = MyDict<string> // This works
				if ("typeParameters" in node && node.typeParameters && node.typeParameters.length > 0) {
					return;
				}

				if (!types) {
					types = [];
					this.typeDecl.set(moduleName, types);
				}
				types.push(node);
			}
		});
	}

	writeAmbientModuleDeclarations(): Promise<void> {
		let out = "/* eslint-disable */\n";
		for (const [moduleName, types] of this.typeDecl) {
			out += moduleDeclaration(this.virtualModuleName, { moduleName, types });
		}

		return mkdir(this.outDirectory, { recursive: true }).then(() =>
			safeWriteGeneratedFile([this.outDirectory, "index.d.ts"], out, this.reporter)
		);
	}

	private outputFilePath(moduleName: ModulePath, typeName?: string) {
		const basePath = join(this.outDirectory, moduleName);
		if (typeName) return `${basePath}_${typeName}.js`;
		return `${basePath}.js`;
	}

	async writeRunTimeTypeChecks(): Promise<void> {
		const config = {
			...DEFAULT_CONFIG,
			// path,
			tsconfig: this.tsconfigPath,

			// Disallow the to be checked type to contain additional properties
			additionalProperties: false,
			expose: "export",
			markdownDescription: false,
			minify: false,
			topRef: true,
			skipTypeCheck: true, // Faster
		} satisfies CompletedConfig;

		const parser = createParser(this.program, config);
		const formatter = createFormatter(config);
		const schemaGenerator = new SchemaGenerator(this.program, parser, formatter);

		// For each module, the following code is generated:
		// - A validation function generated by Ajv for each type in the module. Each validation function is placed in a
		//   separate file. The file name is the concatenation of the module name and the type name.
		//   For example, if the module name is `/path/to/myModule` and the type name is `MyType`, the file name is
		//   `@/tsrc/path/to/myModule_MyType.js`. The user never interacts with these files directly.
		// - A module containing the type guard, type assertion, and type cast functions for each type in the module,
		//   which are essentially wrappers around the validation function. This is the module that the user imports.
		//   The module name is the module name prefixed with `@/tsrc`.

		const promises: Promise<unknown>[] = [];

		for (const modulePath of this.foundModules) {
			await mkdir(dirname(this.outputFilePath(modulePath)), { recursive: true });

			const types = this.typeDecl.get(modulePath);
			if (!types) {
				console.error("No types found for ", modulePath);
				continue;
			}

			promises.push(this.writeAjvWrapperModule(modulePath, types));
			promises.push(this.writeAjvModules(modulePath, types, schemaGenerator));
		}

		await Promise.all(promises);
	}

	private writeAjvWrapperModule(moduleName: ModulePath, types: Declaration[]) {
		const imports = types
			.map(getName)
			.map((typeName) => `import validate${typeName} from "./${basename(moduleName)}_${typeName}"`)
			.join("\n");

		const fileBody = types.map(validatorFns).join("\n");

		return safeWriteGeneratedFile(
			this.outputFilePath(moduleName),
			imports + fileBody,
			this.reporter
		);
	}

	private writeAjvModules(
		moduleName: ModulePath,
		types: Declaration[],
		schemaGenerator: SchemaGenerator
	): Promise<unknown> {
		const generatedCode = types.map((type) => {
			const typeName = getName(type);
			//
			const schema = schemaGenerator.createSchemaFromNodes([type]);
			const validate = this.ajv.compile(schema);
			const fileContents = standalone(this.ajv, validate);

			return safeWriteGeneratedFile(
				this.outputFilePath(moduleName, typeName),
				fileContents,
				this.reporter
			);
		});

		return Promise.all(generatedCode);
	}

	/**
	 * Gets the module name from a given absolute path to a file in the project directory.
	 *
	 * The module name is the path relative to the project directory without the file extension. It
	 * does not contain a leading slash.
	 *
	 * Example:
	 * /path/to/project/src/components/Button.tsx -> src/components/Button
	 */
	private moduleName(sourceFile: ts.SourceFile): ModulePath {
		return removeFileExtension(
			// +1 to remove the leading slash
			sourceFile.fileName.slice(this.projectDirectory.length + 1)
		) as ModulePath;
	}

	/**
	 * The types that are eligible for run time type checks. Used to generate ambient module declarations.
	 *
	 * The key is a module name, and the value is an array of type declarations contained in that module.
	 */
	private typeDecl = new Map<ModulePath, Declaration[]>();

	/**
	 * The modules containing run time type checks that have been imported somewhere in the project.
	 * This is the list of run time type checks that need to be generated.
	 */
	public foundModules = new Set<ModulePath>();
}

////

function getName(declNode: Declaration): string {
	return declNode.name.escapedText as string;
}

//// Code generation templates at end of file for clarity

function moduleDeclaration(
	virtualModuleName: string,
	inp: { moduleName: ModulePath; types: Declaration[] }
): string {
	// Each module declaration must include its own import of the Jsonify type.
	// Including it once at the top of the file breaks auto-imports in the IDE.
	return `
declare module "${virtualModuleName}/${inp.moduleName}" {
	import type { Jsonify } from "type-fest";
	import type { ${inp.types.map(getName).join(", ")} } from "~/${inp.moduleName}";
	${inp.types.map(functionDecls).join("\n")}
}`;
}

function functionDecls(declNode: Declaration) {
	const typeName = getName(declNode);
	return `
	export function is${typeName}(arg: unknown): arg is Jsonify<${typeName}>;
	export function assert${typeName}(arg: unknown): asserts arg is Jsonify<${typeName}>;
	export function cast${typeName}(arg: unknown): Jsonify<${typeName}>;`;
}

function removeFileExtension(path: string): string {
	return path.replace(/\.[^.]+$/, "");
}

function validatorFns(declNode: Declaration) {
	const typeName = getName(declNode);
	return `
export function assert${typeName}(arg) {
	const isValid = validate${typeName}(arg);
	if(isValid) return;
	const message = validate${typeName}.errors ? validate${typeName}.errors[0].message : "Unknown error";
	throw new Error("Cannot convert to type ${typeName}: " + message);
}
export function cast${typeName}(arg) {
	assert${typeName}(arg);
	return arg;
}
export function is${typeName}(arg) {
	return validate${typeName}(arg);
}
`;
}

export async function safeWriteGeneratedFile(
	filePath: PathArg,
	fileContents: string | null,
	report: GeneratedFilesReporter,
	reportSkippedFiles = false
): Promise<void> {
	if (fileContents) fileContents = `${GENERATED_HEADER_TS}\n${fileContents}`;
	return safeWriteGeneratedFile_(filePath, fileContents, report, reportSkippedFiles);
}
