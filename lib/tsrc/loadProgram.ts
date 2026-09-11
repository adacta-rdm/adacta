import { resolve } from "node:path";

import ts from "typescript";

/**
 * Loads the nearest tsconfig and creates its TypeScript Program.
 */
export function loadProgram(projectDirectory: string): ts.Program {
	const resolvedProjectDirectory = resolve(projectDirectory);
	const tsconfigPath = ts.findConfigFile(resolvedProjectDirectory, (path) =>
		ts.sys.fileExists(path),
	);
	if (!tsconfigPath) throw new Error("Could not find a valid 'tsconfig.json'.");

	const configFile = ts.readConfigFile(tsconfigPath, (path) => ts.sys.readFile(path));
	if (configFile.error) {
		throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"));
	}

	const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, resolvedProjectDirectory);
	const host = ts.createCompilerHost(config.options);
	// The Program exposes this value through `getCurrentDirectory()`. TSRC uses
	// that method as the common project-root contract for later compilation.
	host.getCurrentDirectory = () => resolvedProjectDirectory;
	return ts.createProgram({ rootNames: config.fileNames, options: config.options, host });
}
