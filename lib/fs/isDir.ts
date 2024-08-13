import { stat } from "fs/promises";

import type { PathArg } from "./private/normalizePath";
import { normalizePath } from "./private/normalizePath";

export async function isDir(path: PathArg) {
	try {
		const stats = await stat(normalizePath(path));
		return stats.isDirectory();
	} catch (e: any) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		if (e.code && e.code === "ENOENT") {
			return false;
		}
		throw e;
	}
}
