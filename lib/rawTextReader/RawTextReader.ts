import assert from "assert";

import type { StorageEngine } from "~/lib/storage-engine";

export class RawTextReader {
	private path: string;
	private utf8Decoder: TextDecoder;

	constructor(path: string, private sto: StorageEngine) {
		this.path = path;
		this.utf8Decoder = new TextDecoder("utf-8");
	}

	async buffer(start: number, end?: number): Promise<{ buffer: Buffer; bytesRead: number }> {
		assert(start >= 0, "RawTextReader: start < 0");
		assert(end === undefined || start < end, "RawTextReader: end <= start");

		const length = end != undefined ? end - start : undefined;
		const { buffer, bytesRead } = await this.sto.read(this.path, {
			position: start,
			length,
			buffer: Buffer.alloc(length ?? (await this.sto.size(this.path))),
		});

		return { buffer, bytesRead };
	}

	async text(
		startByte: number,
		endByte?: number
	): Promise<{ buffer: Buffer; bytesRead: number; text: string }> {
		const { buffer, bytesRead } = await this.buffer(startByte, endByte);
		return { buffer, bytesRead, text: this.utf8Decoder.decode(buffer.subarray(0, bytesRead)) };
	}
}
