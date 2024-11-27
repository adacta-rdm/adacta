export async function uploadFileBrowser(file: File, uploadURL: string): Promise<void> {
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
