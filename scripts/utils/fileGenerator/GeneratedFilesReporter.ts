import type { PathArg } from "@omegadot/fs";
import { normalizePath } from "@omegadot/fs";

/**
 * A simple class to keep track of the files that have been generated.
 */
export class GeneratedFilesReporter {
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

	private add(path: PathArg, verb: "removed" | "written" | "skipped") {
		this.entries.push(`${verb}: ${normalizePath(path)}`);
	}
}
