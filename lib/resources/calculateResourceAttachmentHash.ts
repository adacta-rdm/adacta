import type { BinaryLike } from "crypto";
import crypto from "crypto";
import type { Readable as NodeReadable } from "stream";

import { sha256 } from "../utils/sha256";

import type { IFileHash } from "~/apps/repo-server/interface/IFileHash";
import type { Readable } from "~/lib/streams";

export function calculateResourceAttachmentHash(resourceData: BinaryLike): IFileHash {
	return { type: "sha256", value: sha256(resourceData) };
}

export function calculateResourceAttachmentHashStream(
	resourceStream: NodeReadable | Readable<Buffer | string>
): Promise<IFileHash> {
	return new Promise((resolve, reject) => {
		const hash = crypto.createHash("sha256");

		// Error handling
		hash.on("error", reject);
		resourceStream.on("error", reject);

		resourceStream.on("data", (chunk) => {
			hash.update(chunk);
		});
		resourceStream.on("end", () => {
			resolve({ type: "sha256", value: hash.digest("hex") });
		});
	});
}
