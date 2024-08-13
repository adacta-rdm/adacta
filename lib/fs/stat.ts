import { stat as statFs } from "fs/promises";

import type { PathArg } from "./private/normalizePath";
import { normalizePath } from "./private/normalizePath";

export function stat(path: PathArg) {
	return statFs(normalizePath(path));
}
