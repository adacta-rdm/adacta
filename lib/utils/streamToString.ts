import type { Readable } from "stream";

/**
 * Utility function for assertions in the tests.
 */
export async function streamToString(stream: Readable): Promise<string> {
	// lets have a ReadableStream as a stream variable
	const chunks = [];

	for await (const chunk of stream) {
		chunks.push(Buffer.from(chunk));
	}

	return Buffer.concat(chunks).toString("utf-8");
}
