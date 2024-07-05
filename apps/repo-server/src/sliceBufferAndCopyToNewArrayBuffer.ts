import type { StrictArrayBuffer } from "~/lib/interface/StrictArrayBuffer";

/**
 * Converts the passed `Buffer` into an owned `ArrayBuffer`.
 * This is achieved by copying the relevant part of the buffer into a new `ArrayBuffer`.
 * You probably do NOT need this function. Make sure to read the rules in the README.
 * @param buffer the buffer to convert
 */
export function sliceBufferAndCopyToNewArrayBuffer(buffer: Buffer): StrictArrayBuffer {
	// Returns a new ArrayBuffer whose contents are a copy of this ArrayBuffer's bytes from begin (inclusive) up to
	// end (exclusive).
	// See also https://nodejs.org/docs/latest/api/buffer.html#buffer_buf_byteoffset
	return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}
