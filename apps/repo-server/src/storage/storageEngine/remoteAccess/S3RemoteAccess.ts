import type { S3StorageEngine } from "@omegadot/storage-engine";

import { StorageEngineRemoteAccess } from "./StorageEngineRemoteAccess";

export class S3RemoteAccess extends StorageEngineRemoteAccess {
	constructor(private sto: S3StorageEngine) {
		super();
	}

	async getDownloadLink(path: string, filename?: string): Promise<string> {
		return this.sto.getDownloadLink(path, filename);
	}

	getUploadLink(uploadId: string): Promise<string> {
		return this.sto.getUploadLink(uploadId);
	}
}
