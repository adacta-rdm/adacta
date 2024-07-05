import type { TransformCallback } from "stream";
import { Transform } from "stream";

/**
 *
 */
export class LineTransform extends Transform {
	private lineCharacters: string[] = [];

	constructor() {
		super({ readableObjectMode: true });
	}

	_transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback) {
		for (const char of chunk.toString()) {
			// 0x0a is \n
			if (char === "\n") {
				this.push(this.lineCharacters.join(""));
				this.lineCharacters = [];
				continue;
			}
			this.lineCharacters.push(char.toString());
		}
		callback();
	}

	_flush(callback: TransformCallback) {
		callback(null, this.lineCharacters.join(""));
	}
}
