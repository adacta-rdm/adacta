import { mkdir } from "fs/promises";

import type { PathArg } from "./private/normalizePath";
import { normalizePath } from "./private/normalizePath";

export async function mkdirp(path: PathArg) {
	return mkdir(normalizePath(path), { recursive: true });
}
