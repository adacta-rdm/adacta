export type StorageReadOptions = {
	/**
	 * Zero-based byte offset where the read starts. The default is zero.
	 */
	start?: number;

	/**
	 * Maximum number of bytes to read. An omitted length reads to the end.
	 */
	length?: number;
};

/**
 * Stores files as byte streams under application-chosen paths.
 *
 * Reads and writes transfer bytes incrementally. The engine owns each transfer
 * until it completes or fails.
 */
export abstract class StorageEngine {
	/**
	 * Opens a readable stream for a file or a byte range within it.
	 *
	 * The start is a zero-based byte offset. The length is a byte count. A range
	 * that extends beyond the file returns the available bytes. A start at or
	 * beyond the end returns an empty stream.
	 *
	 * The promise rejects with `FileNotFoundError` before returning a stream when
	 * the file does not exist. Errors that occur during transfer are reported by
	 * the returned stream.
	 */
	abstract read(path: string, options?: StorageReadOptions): Promise<ReadableStream<Uint8Array>>;

	/**
	 * Writes all source bytes to a file and replaces any existing contents.
	 *
	 * The promise resolves after the source is consumed and the destination is
	 * closed. It rejects when either side of the transfer fails.
	 */
	abstract write(path: string, source: ReadableStream<Uint8Array>): Promise<void>;

	/**
	 * Deletes a file. The operation has no effect if the file is absent.
	 */
	abstract remove(path: string): Promise<void>;

	/**
	 * Moves a file to a new path.
	 *
	 * The promise rejects with `FileNotFoundError` if the source is absent. It
	 * rejects with `FileAlreadyExistsError` without changing either file if the
	 * destination exists.
	 */
	abstract rename(from: string, to: string): Promise<void>;

	/**
	 * Returns the file size in bytes. The promise rejects if the file is absent.
	 */
	abstract size(path: string): Promise<number>;

	/**
	 * Returns whether the path names a stored file.
	 */
	abstract exists(path: string): Promise<boolean>;
}
