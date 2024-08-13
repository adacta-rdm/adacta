import { StorageEngineRemoteAccess } from "./StorageEngineRemoteAccess";

import type { S3StorageEngine } from "~/lib/storage-engine";

export class S3RemoteAccess extends StorageEngineRemoteAccess {
	constructor(private sto: S3StorageEngine) {
		super();
	}

	async getDownloadLink(path: string, filename?: string): Promise<string> {
		return this.sto.getDownloadLink(path, {
			get: { ResponseContentDisposition: `attachment; filename="${filename ?? path}"` },
		});
	}

	getUploadLink(uploadId: string): Promise<string> {
		return this.sto.getUploadLink(uploadId);
	}
}
