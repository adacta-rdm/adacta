import type { StrictArrayBuffer } from "~/lib/interface/StrictArrayBuffer";

export async function uploadFile(file: File | StrictArrayBuffer, uploadURL: string): Promise<void> {
	const headers = { "Content-Type": "application/octet-stream" };

	const response = await fetch(uploadURL, {
		method: "PUT",
		headers,
		body: file,
	});

	if (response.status !== 200) {
		throw new Error("Unexpected answer for HTTP Request");
	}
}
