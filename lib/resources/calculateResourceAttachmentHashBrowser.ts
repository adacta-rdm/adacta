import type { IFileHash } from "~/apps/repo-server/interface/IFileHash";

export async function calculateResourceAttachmentHashBrowser(
	resource: BufferSource
): Promise<IFileHash> {
	const hashBuffer = await crypto.subtle.digest("SHA-256", resource); // hash the message
	const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(""); // convert bytes to hex string

	return { type: "sha256", value: hashHex };
}
