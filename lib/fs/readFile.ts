import { readFile as readFileFs } from "fs/promises";

import type { PathArg } from "./private/normalizePath";
import { normalizePath } from "./private/normalizePath";

export function readFile(path: PathArg): Promise<Buffer> {
	return readFileFs(normalizePath(path));
}
