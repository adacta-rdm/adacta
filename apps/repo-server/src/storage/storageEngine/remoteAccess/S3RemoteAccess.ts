import { StorageEngineRemoteAccess } from "./StorageEngineRemoteAccess";

import type { S3StorageEngine } from "~/lib/storage-engine";

export class S3RemoteAccess extends StorageEngineRemoteAccess {
	constructor(private sto: S3StorageEngine) {
		super();
	}

	async getDownloadLink(path: string, filename?: string, cache?: number): Promise<string> {
		const getCacheableSignOptions = () => {
			// Round the signing date to the nearest 30 minutes
			// This is done to make the download link more static
			// See https://advancedweb.hu/cacheable-s3-signed-urls/ for a more detailed explanation
			// of the idea behind this.
			//
			// Effective validity:
			// Min: expiryMinutes - roundToMinutes
			// Max: expiryMinutes
			const expirySeconds = Math.min(cache ?? 0, 60 * 60 * 24 * 7); // 7 days is the maximum (otherwise the signer will fail)
			const roundToSeconds = Math.floor(expirySeconds * 0.75);

			const date = new Date(
				Math.floor(new Date().getTime() / (roundToSeconds * 1000)) * (roundToSeconds * 1000)
			);

			return {
				signingDate: date,
				expiresIn: expirySeconds,
			};
		};

		return this.sto.getDownloadLink(path, {
			get: {
				...(filename ? { ResponseContentDisposition: `attachment; filename="${filename}"` } : {}),
				...(cache !== undefined ? { ResponseCacheControl: `max-age=${cache}` } : {}),
			},
			sign: cache !== undefined ? getCacheableSignOptions() : undefined,
		});
	}

	getUploadLink(uploadId: string): Promise<string> {
		return this.sto.getUploadLink(uploadId);
	}
}
