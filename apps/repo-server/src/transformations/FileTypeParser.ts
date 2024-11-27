import type { Detector } from "file-type";
import { NodeFileTypeParser } from "file-type";
import type { FileTypeResult } from "file-type/core";
export function getFileTypeParser() {
	const gamry: Detector = async (tokenizer) => {
		const explainHeader = [69, 88, 80, 76, 65, 73, 78]; // 'EXPLAIN'

		const buffer = new Uint8Array(7);
		await tokenizer.peekBuffer(buffer, { length: explainHeader.length, mayBeLess: true });

		if (explainHeader.every((value, index) => value === buffer[index])) {
			// The types only allow 'ext'/'mime' values from the list of known file types
			// https://github.com/sindresorhus/file-type/issues/692
			return { ext: "dat" as FileTypeResult["ext"], mime: "text/gamry" as FileTypeResult["mime"] };
		}

		return undefined;
	};

	const customDetectors = [gamry];

	const controller = new AbortController();
	const signal = controller.signal;

	return new NodeFileTypeParser({ customDetectors, signal });
}
