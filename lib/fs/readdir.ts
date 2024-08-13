import { readdir as readdirFs } from "fs/promises";

import type { PathArg } from "./private/normalizePath";
import { normalizePath } from "./private/normalizePath";

export function readdir(path: PathArg) {
	return readdirFs(normalizePath(path));
}
