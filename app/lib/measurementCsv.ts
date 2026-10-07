export class MeasurementCsvError extends Error {}

/**
 * Stateful CSV tokenizer shared by the streaming importer and the bounded
 * browser preview. It consumes text chunks, so quoted fields may span chunks.
 */
export class CsvRecordParser {
	private row: string[] = [];
	private cell = "";
	private quoted = false;
	private closed = false;
	private skipLineFeed = false;
	private firstChunk = true;
	private rowNumber = 1;

	constructor(private readonly delimiter: string) {}

	/**
	 * Consume one text chunk and return every complete row found in it.
	 */
	push(text: string, limit = Number.POSITIVE_INFINITY): string[][] {
		if (limit <= 0) return [];
		if (this.firstChunk) {
			text = text.replace(/^\uFEFF/, "");
			this.firstChunk = false;
		}

		const rows: string[][] = [];
		for (const character of text) {
			if (this.skipLineFeed) {
				this.skipLineFeed = false;
				if (character === "\n") continue;
			}

			if (this.quoted) {
				if (character === '"') {
					this.quoted = false;
					this.closed = true;
				} else {
					this.cell += character;
				}
			} else if (character === '"' && this.closed) {
				this.cell += '"';
				this.quoted = true;
				this.closed = false;
			} else if (character === '"' && this.cell === "") {
				this.quoted = true;
			} else if (character === this.delimiter) {
				this.row.push(this.cell);
				this.cell = "";
				this.closed = false;
			} else if (character === "\n" || character === "\r") {
				this.row.push(this.cell);
				rows.push(this.row);
				if (rows.length >= limit) return rows;
				this.row = [];
				this.cell = "";
				this.closed = false;
				this.rowNumber++;
				if (character === "\r") this.skipLineFeed = true;
			} else if (character === '"' || this.closed) {
				throw new MeasurementCsvError(`Malformed CSV near row ${this.rowNumber}.`);
			} else {
				this.cell += character;
			}
		}

		return rows;
	}

	/**
	 * Finish the input and return a final unterminated row, if present.
	 */
	finish(): string[][] {
		if (this.quoted) throw new MeasurementCsvError("The CSV ends inside a quoted cell.");
		if (!this.row.length && this.cell === "" && !this.closed) return [];

		this.row.push(this.cell);
		const row = this.row;
		this.row = [];
		this.cell = "";
		this.closed = false;
		return [row];
	}
}

/**
 * Parse a bounded text sample with the same rules as the streaming importer.
 */
export function parseDelimitedRows(text: string, delimiter: string, limit: number): string[][] {
	const parser = new CsvRecordParser(delimiter);
	const rows = parser.push(text, limit);
	if (rows.length >= limit) return rows.slice(0, limit);
	return rows.concat(parser.finish()).slice(0, limit);
}

/** Parses CSV records while reading only one input chunk at a time.
 * @yields One complete row of fields.
 */
export async function* parseMeasurementCsv(
	source: ReadableStream<Uint8Array>,
	delimiter: string,
	fileName: string,
): AsyncGenerator<string[]> {
	const reader = source.getReader();
	const decoder = new TextDecoder("utf-8", { fatal: true });
	const parser = new CsvRecordParser(delimiter);
	let finished = false;
	try {
		while (true) {
			const { done, value } = await reader.read();
			let text: string;
			try {
				text = decoder.decode(value, { stream: !done });
			} catch {
				throw new MeasurementCsvError(`${fileName} is not valid UTF-8.`);
			}

			for (const row of parser.push(text)) yield row;
			if (done) break;
		}

		finished = true;
		for (const row of parser.finish()) yield row;
	} finally {
		if (!finished) await reader.cancel().catch(() => {});
		reader.releaseLock();
	}
}
