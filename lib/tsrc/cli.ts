/**
 * TSRC command-line entry point.
 *
 * TSRC turns TypeScript type declarations into runtime validators. This command
 * runs the whole pipeline and writes the generated tree:
 *
 *   load program -> scan requests -> compile validators -> render files -> write
 *
 * The ambient declarations expose the requested types to the editor; the
 * runtime modules implement the validators a source file actually imports.
 */
import { resolve } from "node:path";

import { loadProgram } from "~/lib/tsrc/loadProgram";
import { compileAmbientDeclarations } from "~/lib/tsrc/src/compileAmbientDeclarations";
import { compileValidators } from "~/lib/tsrc/src/compileValidators";
import { renderValidatorModules } from "~/lib/tsrc/src/renderValidatorModules";
import { scanProject } from "~/lib/tsrc/src/scanProject";
import { writeOutput } from "~/lib/tsrc/src/writeOutput";

// Run against the project that invoked the command.
const projectDirectory = process.cwd();

async function main(): Promise<void> {
	const { moduleName, ignore } = await loadConfig();
	const outputDirectory = resolve(projectDirectory, moduleName);

	const program = loadProgram(projectDirectory);
	const project = scanProject(program, moduleName, ignore);

	const declarations = [...project.declarationsByModule.values()].flat();
	const modules = compileValidators(program, declarations);

	const files = [
		compileAmbientDeclarations(project, moduleName),
		...renderValidatorModules(modules),
	];

	const report = await writeOutput(outputDirectory, files);

	// A requested module with no produced validator means no eligible type was
	// found for it.
	const producedModules = new Set(modules.map((module) => module.modulePath));
	for (const modulePath of project.requestedModules) {
		if (!producedModules.has(modulePath)) {
			console.warn(`No types found for module '${modulePath}'`);
		}
	}

	for (const entry of report.entries) console.log(` - ${entry}`);
}

void main();

/**
 * Reads the optional `tsrc` field from the project's `package.json`.
 *
 * `moduleName` is the generated output directory and the import alias its
 * validators are published under. `ignore` lists project-relative source files
 * to skip. Both have defaults, so a project with no `tsrc` field still works.
 */
async function loadConfig(): Promise<{ moduleName: string; ignore: string[] }> {
	const pkg = (await Bun.file(resolve(projectDirectory, "package.json")).json()) as {
		tsrc?: unknown;
	};

	const config = { moduleName: "@/tsrc", ignore: [] as string[], ...(pkg.tsrc as object) };

	// Fail loud on a malformed field rather than generating into the wrong place.
	if (typeof config.moduleName !== "string" || !Array.isArray(config.ignore)) {
		throw new Error(`Invalid "tsrc" field in package.json`);
	}

	return config;
}
