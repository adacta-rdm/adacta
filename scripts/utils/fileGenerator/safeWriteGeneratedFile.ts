import type { PathArg } from "@omegadot/fs";
import { readUTF8File, rmrf, writeFile } from "@omegadot/fs";

import type { GeneratedFilesReporter } from "./GeneratedFilesReporter";
import { formatWithPrettier } from "./formatWithPrettier";
import { isGenerated } from "./isGenerated";

/**
 * Utility function to write a generated file to disk.
 * - If the file is already generated and the contents are the same, it will not be written.
 * - If the file is not marked as generated, it will be skipped.
 * - The contents will be formatted with Prettier
 */
export async function safeWriteGeneratedFile(
	filePath: PathArg,
	fileContents: string | null,
	report: GeneratedFilesReporter,
	reportSkippedFiles = false
): Promise<void> {
	let fileContentsDisk: string | undefined;
	try {
		fileContentsDisk = await readUTF8File(filePath);
	} catch (e: any) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		if (e.code !== "ENOENT") throw e;
	}

	if (fileContentsDisk && !isGenerated(fileContentsDisk)) {
		if (reportSkippedFiles) report.skipped(filePath);
		return;
	}

	if (fileContents === null) {
		await rmrf(filePath);
		return report.removed(filePath);
	}
	fileContents = await formatWithPrettier(filePath, fileContents);

	// Don't write if the contents are the same
	if (fileContents === fileContentsDisk) return;

	await writeFile(filePath, fileContents);
	report.written(filePath);
}
