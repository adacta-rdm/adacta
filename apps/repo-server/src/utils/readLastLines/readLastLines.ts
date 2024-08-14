import type { StorageEngine } from "~/lib/storage-engine";

interface IReadLastLinesOptions {
	nLines?: number;
	chunkSize?: number;
}

/**
 * Returns an array of lines from the end of a file. Per default, an empty trailing line will not be included in the
 * array.
 * @param sto - Instance of StorageEngine to use to fetch the file.
 * @param path - The path to the file.
 * @param options.nLines - How many lines to fetch from the end of the file. The returned array can have fewer items in
 *          case the file does not contain that many lines. Default: 1.
 * @param options.chunkSize - How many bytes to fetch at once. Default: 1024.
 */
export async function readLastLines(
	sto: StorageEngine,
	path: string,
	options: IReadLastLinesOptions = {}
): Promise<string[]> {
	const nLines = options.nLines ?? 1;
	const chunkSize = options.chunkSize ?? 1024;

	let lines: string[] = [];
	const filesize = await sto.size(path);

	const chunks: Buffer[] = [];
	let bytesRead = 0;

	while (lines.length <= nLines && bytesRead < filesize) {
		const length = Math.min(filesize - bytesRead, chunkSize);
		// The position from where to start reading from
		const position = filesize - bytesRead - length;
		const result = await sto.read(path, {
			position,
			length,
			buffer: Buffer.alloc(chunkSize),
		});

		if (result.bytesRead === 0) break;

		bytesRead += result.bytesRead;
		chunks.unshift(result.buffer.subarray(0, result.bytesRead));

		lines = Buffer.concat(chunks, bytesRead).toString("utf8").split(/\r?\n/);

		// Remove last line if it's empty
		if (lines[lines.length - 1] === "") lines.pop();
	}

	return lines.slice(-nLines);
}
