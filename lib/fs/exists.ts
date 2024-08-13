import { access } from "fs/promises";

import type { PathArg } from "./private/normalizePath";
import { normalizePath } from "./private/normalizePath";

export async function exists(path: PathArg) {
	try {
		await access(normalizePath(path));
		return true;
	} catch (e) {
		return false;
	}
}
