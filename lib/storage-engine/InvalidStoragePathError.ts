/**
 * A storage path is empty, absolute, or reaches outside the storage directory.
 */
export class InvalidStoragePathError extends TypeError {
	constructor(public readonly path: string) {
		super(`Invalid storage path "${path}".`);
		this.name = "InvalidStoragePathError";
	}
}
