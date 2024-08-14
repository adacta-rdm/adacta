import { readFile } from "fs/promises";

import type { PathArg } from "./private/normalizePath";
import { normalizePath } from "./private/normalizePath";

export function readUTF8File(path: PathArg): Promise<string> {
	return readFile(normalizePath(path), { encoding: "utf8" });
}
