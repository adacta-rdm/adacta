/**
 * Interface for generic table printer which can be used to turn a tabular structure into a string.
 * (i.e. plaintext, markdown)
 */
interface ITablePrinter {
	addRow(row: string[]): void;
	getTable(): string;
}

interface IPrinterOptions {
	columnDelimiter: string;
	rowDelimiter: string;
	maxWidth?: number;
}

/**
 * Simple table printer which prints a table in plaintext format.
 * All columns are padded to the same width.
 * Between columns, a delimiter is inserted.
 */
export class PlainTextTable implements ITablePrinter {
	private rows: string[][] = [];
	private options: IPrinterOptions;

	constructor(options?: Partial<IPrinterOptions>) {
		const defaultOptions = { columnDelimiter: " ", rowDelimiter: "\n", maxWidth: undefined };
		this.options = { ...defaultOptions, ...options };
	}

	addRow(row: string[]) {
		const wrap = (str: string, width: number) =>
			str.replace(new RegExp(`(?![^\\n]{1,${width}}$)([^\\n]{1,${width}})\\s`, "g"), "$1\n");

		const multiLineRows = row.map((r) => {
			if (this.options.maxWidth !== undefined) {
				return wrap(r, this.options.maxWidth).split("\n");
			}

			return r.split("\n");
		});
		const maxLines = Math.max(...multiLineRows.map((r) => r.length));
		for (let i = 0; i < maxLines; i++) {
			this.rows.push(multiLineRows.map((r) => r[i] || ""));
		}
	}

	getTable() {
		const columnWidths = this.rows.reduce(
			(acc, row) => row.map((cell, i) => Math.max(acc[i], cell.length)),
			[0, 0]
		);

		return this.rows
			.map((row) =>
				row
					.map((cell, i) => cell.padEnd(columnWidths[i]))
					.join(this.options.columnDelimiter)
					.concat(this.options.rowDelimiter)
			)
			.join("");
	}
}
