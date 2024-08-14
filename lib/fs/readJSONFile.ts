import type { PathArg } from "./private/normalizePath";
import { readUTF8File } from "./readUTF8File";

export function readJSONFile(path: PathArg): Promise<unknown> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return readUTF8File(path).then((fileContents) => JSON.parse(fileContents));
}
