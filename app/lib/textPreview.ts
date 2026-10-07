import type { FileProbe } from "~/app/lib/FileProbe.ts";
import { parseDelimitedRows } from "~/app/lib/measurementCsv.ts";

export type TextPreview = {
	text: string;
	truncated: boolean;
	bytesRead: number;
	linesShown: number;
};

export type CsvPreview = {
	delimiter: string;
	rows: string[][];
	truncated: boolean;
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

/**
 * Parse a bounded CSV text preview after guessing its delimiter.
 */
export function parseCsvPreview(preview: TextPreview, maxRows = 12): CsvPreview {
	const delimiter = guessCsvDelimiter(preview.text);
	let rows: string[][];
	try {
		rows = parseDelimitedRows(preview.text, delimiter, maxRows);
	} catch {
		rows = preview.text
			.split(/\r\n|\n|\r/)
			.filter(Boolean)
			.slice(0, maxRows)
			.map((line) => [line]);
	}
	return { delimiter, rows, truncated: preview.truncated || rows.length >= maxRows };
}

function guessCsvDelimiter(text: string): string {
	const candidates = [",", ";", "\t", "|"];
	const lines = text
		.split(/\r\n|\n|\r/)
		.filter((line) => line.trim() !== "")
		.slice(0, 12);
	let best = ",";
	let bestScore = 0;
	for (const candidate of candidates) {
		const counts = lines.map((line) => countOutsideQuotes(line, candidate));
		const active = counts.filter((count) => count > 0);
		if (active.length === 0) continue;
		const average = active.reduce((sum, count) => sum + count, 0) / active.length;
		const consistency =
			active.filter((count) => Math.abs(count - average) <= 1).length / lines.length;
		const score = active.length * 10 + consistency * 5 + average;
		if (score > bestScore) {
			best = candidate;
			bestScore = score;
		}
	}
	return best;
}

function countOutsideQuotes(line: string, delimiter: string): number {
	let quoted = false;
	let count = 0;
	for (let index = 0; index < line.length; index++) {
		if (line[index] === '"') {
			if (quoted && line[index + 1] === '"') index++;
			else quoted = !quoted;
		} else if (line[index] === delimiter && !quoted) {
			count++;
		}
	}
	return count;
}
