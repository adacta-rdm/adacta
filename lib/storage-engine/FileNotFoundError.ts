/**
 * A requested storage path does not name a file.
 */
export class FileNotFoundError extends Error {
	constructor(public readonly path: string) {
		super(`Stored file "${path}" does not exist.`);
		this.name = "FileNotFoundError";
	}
}
