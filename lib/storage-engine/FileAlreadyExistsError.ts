/**
 * A requested storage path already names a file.
 */
export class FileAlreadyExistsError extends Error {
	constructor(public readonly path: string) {
		super(`Stored file "${path}" already exists.`);
		this.name = "FileAlreadyExistsError";
	}
}
