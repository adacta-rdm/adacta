import { writeFile as writeFileFs } from "fs/promises";

import type { PathArg } from "./private/normalizePath";
import { normalizePath } from "./private/normalizePath";

export function writeFile(path: PathArg, data: string | Buffer) {
	return writeFileFs(normalizePath(path), data);
}
