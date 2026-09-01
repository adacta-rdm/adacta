import { mkdir, rename } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

import { FileAlreadyExistsError } from "~/lib/storage-engine/FileAlreadyExistsError";
import { FileNotFoundError } from "~/lib/storage-engine/FileNotFoundError";
import { InvalidStoragePathError } from "~/lib/storage-engine/InvalidStoragePathError";
import { StorageEngine, type StorageReadOptions } from "~/lib/storage-engine/StorageEngine";

/**
 * Stores files below one directory on the local filesystem.
 */
export class FileSystemStorageEngine extends StorageEngine {
	readonly directory: string;

	constructor(directory: string) {
		super();
		this.directory = resolve(directory);
	}

	async read(path: string, options: StorageReadOptions = {}): Promise<ReadableStream<Uint8Array>> {
		const fullPath = this.fullPath(path);
		const start = options.start ?? 0;
		const length = options.length;
		validateRange(start, length);

		// BunFile streams are lazy. Read the size first so a missing file rejects
		// read() before it returns a stream.
		const fileSize = await this.sizeOf(path, fullPath);
		const available = Math.max(0, fileSize - start);
		const bytesToRead = length === undefined ? available : Math.min(length, available);
		if (bytesToRead === 0) return new Blob().stream();

		return Bun.file(fullPath)
			.slice(start, start + bytesToRead)
			.stream();
	}

	async write(path: string, source: ReadableStream<Uint8Array>): Promise<void> {
		const fullPath = this.fullPath(path);
		// An incremental Bun writer does not truncate an existing file. The empty
		// write also creates missing parent directories.
		await Bun.write(fullPath, "");

		const writer = Bun.file(fullPath).writer();

		try {
			// FileSink.write may return a promise while it buffers a chunk. Awaiting it
			// prevents the source from outrunning the destination.
			for await (const chunk of source) await writer.write(chunk);
		} finally {
			// The sink must close when reading the source fails as well as when it ends.
			await writer.end();
		}
	}

	async remove(path: string): Promise<void> {
		try {
			await Bun.file(this.fullPath(path)).delete();
		} catch (error) {
			// Missing files are ignored because removal is idempotent.
			if (!isNotFound(error)) throw error;
		}
	}

	async rename(from: string, to: string): Promise<void> {
		const sourcePath = this.fullPath(from);
		const destinationPath = this.fullPath(to);
		if (sourcePath === destinationPath) return;

		if (await Bun.file(destinationPath).exists()) throw new FileAlreadyExistsError(to);
		await mkdir(dirname(destinationPath), { recursive: true });

		try {
			// Node has no portable no-replace rename. Another process can create the
			// destination between the existence check and this operation.
			await rename(sourcePath, destinationPath);
		} catch (error) {
			// ENOENT can mean that the source is missing or that the destination
			// directory disappeared. Only the first case is a FileNotFoundError.
			if (isNotFound(error) && !(await Bun.file(sourcePath).exists())) {
				throw new FileNotFoundError(from);
			}
			throw error;
		}
	}

	async size(path: string): Promise<number> {
		return this.sizeOf(path, this.fullPath(path));
	}

	async exists(path: string): Promise<boolean> {
		return Bun.file(this.fullPath(path)).exists();
	}

	/**
	 * Resolves a storage path within the configured directory.
	 *
	 * For example, `runs/1.csv` below `/data` resolves to
	 * `/data/runs/1.csv`, and `runs/../1.csv` resolves to `/data/1.csv`.
	 * Empty paths, absolute paths, and paths such as `../secret.txt` throw an
	 * `InvalidStoragePathError`.
	 */
	private fullPath(path: string): string {
		if (path === "" || path === "." || path.includes("\0") || isAbsolute(path)) {
			throw new InvalidStoragePathError(path);
		}

		const fullPath = resolve(this.directory, path);
		const relativePath = relative(this.directory, fullPath);
		if (relativePath === "" || relativePath === ".." || relativePath.startsWith(`..${sep}`)) {
			throw new InvalidStoragePathError(path);
		}

		return fullPath;
	}

	private async sizeOf(path: string, fullPath: string): Promise<number> {
		try {
			const result = await Bun.file(fullPath).stat();
			if (!result.isFile()) throw new FileNotFoundError(path);
			return result.size;
		} catch (error) {
			throwNotFound(error, path);
		}
	}
}

function validateRange(start: number, length: number | undefined): void {
	if (!Number.isSafeInteger(start) || start < 0) {
		throw new RangeError("Storage range start must be a nonnegative safe integer.");
	}
	if (length !== undefined && (!Number.isSafeInteger(length) || length < 0)) {
		throw new RangeError("Storage range length must be a nonnegative safe integer.");
	}
}

function throwNotFound(error: unknown, path: string): never {
	if (isNotFound(error)) throw new FileNotFoundError(path);
	throw error;
}

function isNotFound(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: unknown }).code === "ENOENT"
	);
}
