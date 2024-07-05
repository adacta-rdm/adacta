/**
 * Class that provides public file access to remote users, whereas the StorageEngine base class
 * describes file access occurring from within our own server infrastructure or private storage
 * space.
 *
 * Use this class if you need to provide file access to a remote client
 */
export abstract class StorageEngineRemoteAccess {
	/**
	 * Returns a public download link for the file at the given path. Optionally, a filename can be
	 * provided that will be used instead of the original filename. This is useful as the file pointed
	 * to by the path may have a cryptic name that is inconvenient for the user.
	 *
	 * @param path The path to the file
	 * @param filename The filename to be used in the 'Content-Disposition' header
	 */
	abstract getDownloadLink(path: string, filename?: string): Promise<string>;

	abstract getUploadLink(uploadId: string): Promise<string>;
}
