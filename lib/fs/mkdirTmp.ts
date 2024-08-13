import { mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

export function mkdirTmp(prefix = "") {
	return mkdtemp(join(tmpdir(), "/", prefix));
}
