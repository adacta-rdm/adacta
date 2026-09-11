import { statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

import type ts from "typescript";

import type { ModulePath } from "~/lib/tsrc/types/ModulePath";

/**
 * Applies the shared path rules for one TSRC project.
 */
export class ProjectPaths {
	readonly projectDirectory: string;

	constructor(
		projectDirectory: string,
		private readonly virtualModuleName?: string,
	) {
		this.projectDirectory = resolve(projectDirectory);
	}

	/**
	 * Converts a source file to its extension-free project module path.
	 */
	modulePath(sourceFile: ts.SourceFile): ModulePath {
		const relativeFilename = relative(this.projectDirectory, sourceFile.fileName);
		if (
			isAbsolute(relativeFilename) ||
			relativeFilename === ".." ||
			relativeFilename.startsWith(`..${sep}`)
		) {
			throw new Error(`Source file '${sourceFile.fileName}' is outside the project directory`);
		}

		// Strip a `.d.ts` declaration extension whole, otherwise a single trailing
		// extension. This keeps a mirrored library path such as
		// `node_modules/type-fest/source/basic` clean.
		return relativeFilename.replaceAll(sep, "/").replace(/\.d\.ts$|\.[^.]+$/, "") as ModulePath;
	}

	/**
	 * Resolves a configured path and marks directories with a trailing separator.
	 */
	resolve(configuredPath: string): string {
		const resolvedPath = resolve(this.projectDirectory, configuredPath);
		const stat = statSync(resolvedPath, { throwIfNoEntry: false });
		return stat?.isDirectory() ? resolvedPath + sep : resolvedPath;
	}

	/**
	 * Removes the generated module prefix from an import path.
	 */
	generatedModulePath(importPath: string): ModulePath | undefined {
		if (!this.virtualModuleName) return undefined;
		const normalizedModuleName = this.virtualModuleName
			.replaceAll("\\", "/")
			.replace(/^\/+|\/+$/g, "");
		const prefix = `${normalizedModuleName}/`;
		if (!importPath.startsWith(prefix) || importPath.length === prefix.length) return undefined;
		return importPath.slice(prefix.length) as ModulePath;
	}
}
