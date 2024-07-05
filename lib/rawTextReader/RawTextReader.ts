import assert from "assert";

import type { StorageEngine } from "@omegadot/storage-engine";

export class RawTextReader {
	private path: string;
	private utf8Decoder: TextDecoder;

	constructor(path: string, private sto: StorageEngine) {
		this.path = path;
		this.utf8Decoder = new TextDecoder("utf-8");
	}

	async text(start: number, end?: number): Promise<string> {
		assert(start >= 0, "RawDataStream.rows: start < 0");
		assert(end === undefined || start < end, "RawDataStream.rows: end <= start");

		const length = end != undefined ? end - start : undefined;
		const { buffer, bytesRead } = await this.sto.read(this.path, {
			position: start,
			length,
			buffer: Buffer.alloc(length ?? (await this.sto.size(this.path))),
		});
		return this.utf8Decoder.decode(buffer.subarray(0, bytesRead));
	}
}
