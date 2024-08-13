import fs from "fs";
import type { FileHandle } from "fs/promises";
import { readFile, rename, rm, writeFile } from "fs/promises";
import { Readable as NodeReadable } from "node:stream";
import { cwd } from "process";

import semver from "semver";

import { FileNotFoundError } from "./FileNotFoundError";
import { ReusableFileHandle } from "./ReusableFileHandle";
import type { IReadOptions } from "./StorageEngine";
import { StorageEngine } from "./StorageEngine";

import { stat } from "~/lib/fs";
import { createPipeline, createWritable } from "~/lib/streams";
import type { Readable, Writable } from "~/lib/streams";

// Some of this code is not compatible with older NodeJS versions
// NOT compatible with NodeJS 14
// UNTESTED WITH NodeJS 15
// TESTED only with NodeJS 16
// The error pattern is somewhat subtle (especially if the function is not considered in isolation),
// since in some cases simply too much is read or returned. To prevent potential problems this class
// therefore checks for the minimum node version on its own
const MIN_NODE_VERSION = 16;

const nodeVersion = process.version;
if (!semver.satisfies(nodeVersion, `>=${MIN_NODE_VERSION}`)) {
	throw new Error(
		`Your node version ${nodeVersion} is not supported by this StorageEngine implementation (LocalFileEngine requires Node >=${MIN_NODE_VERSION})`
	);
}

export class FileSystemStorageEngine extends StorageEngine {
	private fileHandles = new Map<string, ReusableFileHandle>();

	constructor(private directory: string = cwd()) {
		super();
	}

	async read(path: string, options: IReadOptions = {}) {
		let freeHandle;

		try {
			const { handle, free } = await this.open(path);
			freeHandle = free;
			// Explicitly set position so that the read function will not continue reading from where it left off when
			// it was last invoked
			const position = options.position ?? 0;
			return await handle.read({ ...options, position });
		} catch (e) {
			if (isENOENTError(e)) {
				throw new FileNotFoundError();
			}
			throw e;
		} finally {
			if (freeHandle) freeHandle();
		}
	}

	async readReverse(path: string, options: IReadOptions = {}) {
		const filesize = await this.size(path);

		const { handle, free } = await this.open(path);
		try {
			const reversePosition = options.position ?? 0;
			if (reversePosition >= filesize) {
				return { buffer: Buffer.alloc(0), bytesRead: 0 };
			}
			const length = Math.min(
				options.length ?? options.buffer?.length ?? 1024,
				filesize - reversePosition
			);
			const position = filesize - (options.position ?? 0) - length;
			const buffer = options.buffer ?? Buffer.alloc(length);

			const { bytesRead } = await handle.read({ position, length, buffer });

			for (let i = 0; i < bytesRead / 2; i++) {
				const tmp = buffer[i];
				buffer[i] = buffer[bytesRead - i - 1];
				buffer[bytesRead - i - 1] = tmp;
			}

			return { buffer, bytesRead };
		} finally {
			free();
		}
	}

	readFile(fileName: string): Promise<Buffer> {
		return readFile(this.fullPath(fileName));
	}

	async write(fileName: string, contents: Buffer): Promise<void> {
		await writeFile(this.fullPath(fileName), contents);
	}

	async append(fileName: string, contents: Buffer): Promise<void> {
		const { handle, free } = await this.open(fileName, "a");
		try {
			return await handle.appendFile(contents);
		} finally {
			free();
		}
	}

	async remove(fileName: string): Promise<void> {
		await rm(this.fullPath(fileName));
	}

	createReadStream(
		path: string,
		options?: { start?: number; end?: number; highWaterMark?: number }
	): Readable<Buffer> {
		const readStream = fs.createReadStream(this.fullPath(path), options);

		const emit = readStream.emit.bind(readStream);
		readStream.emit = (event: string | symbol, ...args: unknown[]): boolean => {
			// Emit our custom FileNotFoundError, if applicable
			if (event === "error" && isENOENTError(args[0])) {
				args[0] = new FileNotFoundError();
			}

			return emit(event, ...args);
		};

		// Wrap the node stream in a Minipass instance
		// TODO: Create helper function to wrap native node streams
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-return
		return (createPipeline as any)(readStream);

		// const mp = new Minipass();
		// readStream.on("drain", () => mp.emit("drain"));
		//
		// // Proxy events
		// // The pipeline is finished when the tail has finished.
		// readStream.on("error", (e) => {
		// 	console.log("error event on node stream.", e.name);
		// 	mp.emit("error", e);
		// });
		// readStream.on("end", () => mp.end());
		// readStream.on("finish", () => mp.end());
		//
		// // When tail is a transform stream, calling out to super write ensures that this
		// // pipeline can be piped again
		// readStream.on("data", (d) => mp.write(d));
		//
		// // readStream.on(all, ( event, ...args) => mp.emit(event, ...args))
		//
		// return mp as any;

		// const readStream = createReadable(
		// 	fs.createReadStream(this.fullPath(path), options)
		// ) as Readable<Buffer>;

		// return (createPipeline as any)(
		// 	fs.createReadStream(this.fullPath(path), options)
		// );

		// const emit: any = readStream.emit.bind(readStream);
		// readStream.emit = (event: string | symbol, ...args: unknown[]): boolean => {
		// 	// Emit our custom FileNotFoundError, if applicable
		// 	if (event === "error" && isENOENTError(args[0])) {
		// 		const e = new FileNotFoundError();
		// 		return emit("error", e);
		// 	}
		//
		// 	return emit(event, ...args);
		// };

		// return readStream;
	}

	createWriteStream(path: string): Writable<Buffer> {
		return createWritable(fs.createWriteStream(this.fullPath(path)));
	}

	/**
	 * Returns a readable stream that emits data in reverse order. The `start` and `end` options are also reversed,
	 * meaning that a `start` value of 0 will begin reading from the end of the file.
	 */
	createReverseReadStream(
		path: string,
		options: { highWaterMark?: number; start?: number; end?: number } = {}
	): NodeReadable {
		let position = 0;

		const readReverse = (buffer: Buffer) => this.readReverse(path, { buffer, position });

		// Implementing the stream with "simplified construction"
		// https://nodejs.org/docs/latest-v16.x/api/stream.html#simplified-construction
		// https://nodejs.org/en/docs/guides/backpressuring-in-streams/#rules-specific-to-readable-streams
		return new NodeReadable({
			highWaterMark: options.highWaterMark,
			async read(size) {
				const { buffer, bytesRead } = await readReverse(Buffer.alloc(size));
				position += bytesRead;

				if (bytesRead === 0) return this.push(null);

				// Shrink the buffer in case fewer bytes than available space in the buffer were read
				if (bytesRead !== buffer.length) {
					return this.push(buffer.subarray(0, bytesRead));
				}

				this.push(buffer);
			},
		});
	}

	async size(fileName: string) {
		try {
			return (await stat(this.fullPath(fileName))).size;
		} catch (e) {
			if (isENOENTError(e)) {
				throw new FileNotFoundError();
			}
			throw e;
		}
	}

	async exists(fileName: string) {
		try {
			await stat(this.fullPath(fileName));
		} catch (e) {
			if (isENOENTError(e)) {
				return false;
			}
			throw e;
		}

		return true;
	}

	private async open(path: string, flags = "r"): Promise<{ handle: FileHandle; free: () => void }> {
		path = this.fullPath(path);
		let reusableFileHandle = this.fileHandles.get(path);
		if (!reusableFileHandle || reusableFileHandle.flags !== flags) {
			reusableFileHandle = new ReusableFileHandle(path, 1000, flags);
			this.fileHandles.set(path, reusableFileHandle);
		}

		return reusableFileHandle.getFileHandle();
	}

	public fullPath(fileName: string) {
		return `${this.directory}/${fileName}`;
	}

	async rename(oldFileName: string, newFileName: string): Promise<void> {
		try {
			await rename(this.fullPath(oldFileName), this.fullPath(newFileName));
		} catch (e) {
			if (isENOENTError(e)) {
				throw new FileNotFoundError();
			}
			throw e;
		}
	}
}

function isENOENTError(e: unknown): boolean {
	return Boolean(e && typeof e === "object" && "code" in e && e.code === "ENOENT");
}
