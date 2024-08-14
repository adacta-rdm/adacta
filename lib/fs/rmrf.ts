import { rm } from "fs/promises";

import type { PathArg } from "./private/normalizePath";
import { normalizePath } from "./private/normalizePath";

export function rmrf(path: PathArg) {
	return rm(normalizePath(path), { force: true, recursive: true });
}
