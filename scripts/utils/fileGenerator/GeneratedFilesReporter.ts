import { relative } from "node:path";

import type { PathArg } from "~/lib/fs";
import { normalizePath } from "~/lib/fs";

/**
 * A simple class to keep track of the files that have been generated.
 */
export class GeneratedFilesReporter {
	constructor(baseDir?: PathArg) {
		if (baseDir !== undefined) this.baseDir = normalizePath(baseDir);
	}

	entries: string[] = [];

	/**
	 * Called when a file is skipped because it is not generated.
	 */
	skipped(path: PathArg) {
		this.add(path, "skipped");
	}

	/**
	 * Called when a file is removed.
	 */
	removed(path: PathArg) {
		this.add(path, "removed");
	}

	/**
	 * Called when changes were written.
	 */
	written(path: PathArg) {
		this.add(path, "written");
	}

	/**
	 * Flushes the entries so that they are not reported again.
	 */
	flush() {
		this.entries = [];
	}

	private add(path: PathArg, verb: "removed" | "written" | "skipped") {
		let outputPath = normalizePath(path);
		if (this.baseDir && outputPath.startsWith(this.baseDir)) {
			outputPath = relative(this.baseDir, outputPath);
		}
		this.entries.push(`${verb}: ${outputPath}`);
	}

	/**
	 * A given base directory not to be included in the output.
	 */
	private baseDir: string | undefined;
}
