import type { Readable, Writable } from "~/lib/streams";

export interface IReadOptions {
	buffer?: Buffer;
	position?: number;
	length?: number;
}

/**
 * Base class that describes basic io operations to files.
 *
 * Methods that operate on existing files will throw an error of type `FileNotFoundError` to indicate that the file or
 * a component of the specified pathname does not exist.
 *
 * A dedicated class (`StorageEngineRemoteAccess`) exists for providing efficient access to these files to remote users.
 */
export abstract class StorageEngine {
	abstract write(fileName: string, contents: Buffer): Promise<void>;

	abstract read(
		path: string,
		options?: IReadOptions
	): Promise<{ bytesRead: number; buffer: Buffer }>;

	abstract remove(fileName: string): Promise<void>;

	abstract rename(oldFileName: string, newFileName: string): Promise<void>;

	/**
	 * Returns the size of the file in bytes.
	 *
	 * An error of type `FileNotFoundError` is thrown if the file does not exist.
	 *
	 * @param fileName
	 * @throws FileNotFoundError
	 */
	abstract size(fileName: string): Promise<number>;

	/**
	 * Returns true if the file exists, otherwise false.
	 */
	abstract exists(fileName: string): Promise<boolean>;

	/**
	 * Options can include start and end values to read a range of bytes from the file instead of the entire file.
	 * Both start and end are inclusive and start counting at 0, allowed values are in the [0, Number.MAX_SAFE_INTEGER]
	 * range.
	 *
	 * The amount of data potentially buffered can be set using the highWaterMark option, which specifies a total number
	 * of bytes. Once the total size of the internal read buffer reaches the threshold specified by highWaterMark, the
	 * stream will temporarily stop reading data from the underlying resource until the data currently buffered can be
	 * consumed.
	 *
	 * The highWaterMark option is a threshold, not a limit: it dictates the amount of data that a stream buffers before
	 * it stops asking for more data. It does not enforce a strict memory limitation in general.
	 *
	 * An error event with a payload of type `FileNotFoundError` is emitted if the file does not exist.
	 */
	abstract createReadStream(
		path: string,
		options?: { start?: number; end?: number; highWaterMark?: number }
	): Readable<Buffer>;

	/**
	 * Returns a writable stream, useful for writing large files.
	 *
	 * @param path - The path to be written to.
	 */
	abstract createWriteStream(path: string): Writable<Buffer>;

	/**
	 * Asynchronously reads the entire contents of a file.
	 *
	 * @deprecated
	 */
	abstract readFile(fileName: string): Promise<Buffer>;

	/**
	 * @deprecated - Use createReadStream instead
	 */
	readFileStream(path: string): Readable<Buffer> {
		return this.createReadStream(path);
	}
}
