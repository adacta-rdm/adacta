import { mkdir, readdir, rm } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

import { format } from "oxfmt";

import type { OutputFile } from "~/lib/tsrc/types/OutputFile";

const GENERATED_HEADER = "// @generated";

/**
 * Changed paths reported relative to the configured output directory.
 */
export interface WriteOutputReport {
	readonly entries: string[];
}

/**
 * Writes changed generated files and removes obsolete generated files.
 * Manually maintained files in the output directory remain unchanged.
 */
export async function writeOutput(
	outputDirectory: string,
	files: readonly OutputFile[],
): Promise<WriteOutputReport> {
	const entries: string[] = [];
	const expectedPaths = new Set(files.map((file) => resolve(outputDirectory, file.relativePath)));

	const written = await Promise.all(files.map((file) => writeGeneratedFile(outputDirectory, file)));

	for (const entry of written) {
		if (entry) entries.push(entry);
	}

	for (const filePath of await outputFiles(outputDirectory)) {
		if (expectedPaths.has(filePath)) continue;

		const contents = await read(filePath);
		if (!contents?.startsWith(GENERATED_HEADER)) continue;

		await rm(filePath);
		entries.push(`removed: ${relative(outputDirectory, filePath)}`);
	}

	return { entries };
}

async function writeGeneratedFile(
	outputDirectory: string,
	file: OutputFile,
): Promise<string | undefined> {
	const filePath = resolve(outputDirectory, file.relativePath);
	const contents = `${GENERATED_HEADER}\n${file.contents}`;
	const existing = await read(filePath);

	// An unmarked file belongs to the developer who placed it there.
	if (existing !== undefined && !existing.startsWith(GENERATED_HEADER)) return;

	const { code } = await format(filePath, contents, {
		printWidth: 100,
		sortImports: true,
		useTabs: true,
	});

	if (code === existing) return;

	await mkdir(dirname(filePath), { recursive: true });
	await Bun.write(filePath, code);

	return `written: ${relative(outputDirectory, filePath)}`;
}

async function read(filePath: string): Promise<string | undefined> {
	const file = Bun.file(filePath);
	if (!(await file.exists())) return;

	return file.text();
}

async function outputFiles(directory: string): Promise<string[]> {
	try {
		const entries = await readdir(directory, { withFileTypes: true });
		const files = await Promise.all(
			entries.map(async (entry) => {
				const path = resolve(directory, entry.name);
				return entry.isDirectory() ? await outputFiles(path) : [path];
			}),
		);

		return files.flat();
	} catch (error) {
		if (isFileNotFound(error)) return [];
		throw error;
	}
}

function isFileNotFound(error: unknown): boolean {
	return error instanceof Error && "code" in error && error.code === "ENOENT";
}
