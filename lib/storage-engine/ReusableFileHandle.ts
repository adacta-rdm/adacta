import { promises } from "fs";
import type { FileHandle } from "fs/promises";

import type { IRefreshableTimeout } from "./refreshableTimeout";
import { setRefreshableTimeout } from "./refreshableTimeout";

// Cannot currently import from "fs/promises" directly, see
// https://stackoverflow.com/questions/64725249/fs-promises-api-in-typescript-not-compiling-in-javascript-correctly
const { open } = promises;

/**
 * Provides a read-only file handle to the file with the given path. When `free()` is called, the
 * class keeps the file open until `timeout` milliseconds, unless another file handle has been
 * requested within that time period. In that case, the file is again kept open until the next call
 * to `free()`.
 * Should the file have been closed due to inactivity and a handle is again requested, then the file
 * is opened transparently and the handle is returned.
 */
export class ReusableFileHandle {
	private readonly timeout: number;
	private readonly path: string;
	private fileHandle: FileHandle | undefined;
	private timeoutHandle: IRefreshableTimeout | undefined;
	private refCount = 0;

	/**
	 * @param path - Path to the file.
	 * @param timeout - Timeout after which the file is automatically closed after `free()` is called.
	 * @param flags - File system flags, e.g. "r" for reading, or "a" for appending. See https://nodejs.org/api/fs.html#file-system-flags
	 */
	constructor(path: string, timeout: number, public readonly flags = "r") {
		this.path = path;
		this.timeout = timeout;
	}

	/**
	 * Returns a read only file handle.
	 */
	async getFileHandle(): Promise<{ handle: FileHandle; free: () => void }> {
		if (!this.fileHandle) {
			this.fileHandle = await open(this.path, this.flags);
		}
		if (this.timeoutHandle) {
			// Reset running timeout that may have been triggered by a potential previous free()
			// call.
			this.timeoutHandle.clear();
		}

		++this.refCount;
		let freed = false;

		return {
			handle: this.fileHandle,
			/**
			 * Indicates that the file is no longer needed by the caller. Starts a timeout
			 * (of `timeout` ms) to close the file handler if no one else is using another handle.
			 * This is done in case another request to read from the same file comes shortly after
			 * the first which is a frequent use case.
			 */
			free: () => {
				// Exit early if the function has already been called before.
				if (freed) return;
				freed = true;

				if (--this.refCount === 0) {
					this.timeoutHandle = setRefreshableTimeout(() => {
						// Note: Previously `this.fileHandle = undefined` was inside a `finally`
						// callback on `close()`, but we cannot use finally here. There is a short
						// timeframe where the fileHandle is closed (fd === -1), but
						// `this.fileHandle` is not yet set to undefined if we did. If another call
						// to `getFileHandle` comes in this timeframe, the caller will receive a
						// broken fileHandle.

						// Ignore closing errors but print them for debugging
						// eslint-disable-next-line no-console
						this.fileHandle?.close().catch((e) => console.error(e));
						this.fileHandle = undefined;
					}, this.timeout);
				}
			},
		};
	}
}
