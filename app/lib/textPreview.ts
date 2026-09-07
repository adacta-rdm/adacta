import type { FileProbe } from "~/app/lib/FileProbe.ts";

export type TextPreview = {
	text: string;
	truncated: boolean;
	bytesRead: number;
	linesShown: number;
};

/**
 * Reads the beginning of a source and returns a bounded plain-text preview.
 */
export async function readTextPreview(
	source: FileProbe,
	options: { maxBytes?: number; maxLines?: number } = {},
): Promise<TextPreview> {
	const maxBytes = options.maxBytes ?? 64 * 1024;
	const maxLines = options.maxLines ?? 50;
	const bytes = await source.read(0, maxBytes);
	const decoded = new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");
	const lines = decoded.split(/\r\n|\n|\r/);
	const visibleLines = lines.slice(0, maxLines);

	return {
		text: visibleLines.join("\n"),
		truncated: source.size > bytes.byteLength || lines.length > visibleLines.length,
		bytesRead: bytes.byteLength,
		linesShown: visibleLines.length,
	};
}
