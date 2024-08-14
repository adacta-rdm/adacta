import assert from "assert";
import { Buffer } from "buffer";
import { resolve } from "path";

import type { StorageEngine } from "~/lib/storage-engine";
import { FileNotFoundError } from "~/lib/storage-engine";
import type { Duplex, Readable, Writable } from "~/lib/streams";
import { createDuplex, createPipeline } from "~/lib/streams";

/**
 * The underlying data store for a `TabularData` is a file.
 * It can read rows of data directly from the file without having to read the whole file first.
 *
 * Instances of this class resemble file handles, but additionally provide an API for working with rows and columns of
 * the file.
 */
export class TabularData implements AsyncIterable<readonly number[]> {
	/**
	 * The absolute path to the file to be read.
	 */
	private readonly path: string;

	private readonly sto: StorageEngine;

	private readonly _numColumns: number;

	/**
	 * The number of rows in the file. Negative if the file does not exist.
	 */
	private _numRows: number;
	/**
	 *
	 * @param path - The path to the file to be read. Can be an array, in which case each element of
	 *               the array is treated as a path segment.
	 * @param numColumns
	 * @param numRows
	 */
	private constructor(sto: StorageEngine, path: string, numColumns: number, numRows: number) {
		this.path = path;
		this._numColumns = numColumns;
		this._numRows = numRows;
		this.sto = sto;
	}

	/**
	 * Returns a `TabularData` instance bound to the specified `path`.
	 *
	 * @param path - The path to the file to be read. Can be an array, in which case each element of
	 *               the array is treated as a path segment.
	 * @param numColumns - The number of columns (= the length of a row)
	 */
	static async open(
		sto: StorageEngine,
		path: string | string[],
		numColumns: number
	): Promise<TabularData> {
		const completePath = Array.isArray(path) ? resolve(...path) : path;

		let fileSize;
		try {
			fileSize = await sto.size(completePath);
		} catch (e) {
			// It's ok if the file does not exist. It can be created by calling the `createWriteStream` method.
			if (!(e instanceof FileNotFoundError)) throw e;
		}

		// If fileSize is undefined, the file does not exist which we signal using a negative number.
		// If the table has no columns, then it cannot contain data and hence there cannot be any rows.
		const numRows =
			fileSize === undefined
				? -1
				: numColumns === 0
				? 0
				: fileSize / (Float64Array.BYTES_PER_ELEMENT * numColumns);

		if (!Number.isInteger(numRows)) {
			throw new Error("Corrupted file. Number of rows is not an int.");
		}

		return new TabularData(sto, completePath, numColumns, numRows);
	}

	/**
	 * Returns a Readable stream, where each emitted chunk corresponds to a row of data.
	 */
	static createReadStream(
		sto: StorageEngine,
		path: string | string[],
		numColumns: number
	): Readable<number[]> {
		const completePath = Array.isArray(path) ? resolve(...path) : path;

		const bytesPerRow = numColumns * Float64Array.BYTES_PER_ELEMENT;

		let buffer: Buffer | undefined;

		const a = sto.createReadStream(completePath);
		const b: Duplex<string | Buffer, number[]> = createDuplex({
			transform: (
				chunk: Buffer | string,
				cb: (err: null | Error, data?: number[]) => void
			): void => {
				if (typeof chunk === "string") {
					return cb(new Error("Received string but expected Buffer."));
				}

				buffer = buffer ? Buffer.concat([buffer, chunk]) : chunk;

				const numberOfRows = Math.floor(buffer.length / bytesPerRow);

				let i;
				for (i = 0; i < numberOfRows; ++i) {
					// Sometimes when allocating a Buffer smaller than Buffer.poolSize,
					// for example when calling Buffer.concat, the buffer does not start
					// from a zero offset on the underlying ArrayBuffer.

					// This can cause problems when accessing the underlying ArrayBuffer directly
					// using buf.buffer, as other parts of the ArrayBuffer may be unrelated to
					// the Buffer object itself.

					// See also
					// https://github.com/nodejs/node/issues/24817
					// for insight on stream chunk byte alignment.
					const array: number[] = [];
					const start = i * bytesPerRow;
					const end = (i + 1) * bytesPerRow;
					for (let j = start; j < end; j += Float64Array.BYTES_PER_ELEMENT) {
						array.push(buffer.readDoubleLE(j));
					}

					cb(null, array);
				}

				const bytesRead = i * bytesPerRow;

				// Save any remaining bytes for the next iteration so it can be merged with a new chunk
				buffer = buffer.subarray(bytesRead);
			},
		});

		return createPipeline(a, b);
	}

	/**
	 * Returns a Writable stream, where each written chunk corresponds to a row of data.
	 *
	 * The returned stream's `write` method must be called with an array whose length matches the number of columns in
	 * the table.
	 */
	static createWriteStream(
		sto: StorageEngine,
		path: string | string[],
		numColumns?: number
	): Writable<number[]> {
		const completePath = Array.isArray(path) ? resolve(...path) : path;

		const a: Duplex<number[], Buffer> = TabularData.createTransformStream(numColumns);
		const b: Writable<Buffer> = sto.createWriteStream(completePath);

		a.pipe(b, { proxyErrors: true });

		a.promise = () => b.promise();

		return a;
	}

	/**
	 * Returns a Duplex stream that transforms chunks corresponding to rows of data to their binary representation.
	 *
	 * @param numColumns - Optional parameter that indicates the number of columns in each row. If not specified, then the first row received determines the number of columns.
	 */
	static createTransformStream(numColumns?: number): Duplex<number[], Buffer> {
		let columns = numColumns ?? 0;

		return createDuplex({
			transform: (row: number[]) => {
				if (row.length === 0) {
					throw new Error("Cannot write empty row.");
				}

				// Require consistent number of values for every row
				if (row.length !== columns) {
					if (columns !== 0) {
						throw new Error(
							`Number of values (${row.length}) does not match number of columns (${columns})})`
						);
					}

					// Initialize number of values per row
					columns = row.length;
				}

				const doubles = new Float64Array(row);
				return Buffer.from(doubles.buffer);
			},
		});
	}

	numRows() {
		return this._numRows;
	}

	numColumns() {
		return this._numColumns;
	}

	/**
	 * Returns a shallow copy of the underlying tabular data into a new two-dimensional array,
	 * selected from `start` to `end` (`end` not included) where `start` and `end` represent the index
	 * of items in the underlying tabular data. The underlying data will not be modified.
	 *
	 * @param start - row index, inclusive. If `start` is undefined, rows starts from the index 0.
	 * @param end - row index, exclusive
	 */
	async rows(start = 0, end: number = this.numRows()): Promise<(readonly number[])[]> {
		assert(start >= 0, "TabularDataStream.rows: start < 0");
		if (this.numRows() < 0) throw new FileNotFoundError();
		if (this.numRows() === 0) return [];
		assert(start < end, "TabularDataStream.rows: end <= start");

		const startElementIndex = this.elementIndex(start);
		const endElementIndex = this.elementIndex(end);

		const bytes = (endElementIndex - startElementIndex) * Float64Array.BYTES_PER_ELEMENT;

		const { buffer } = await this.sto.read(this.path, {
			position: startElementIndex * Float64Array.BYTES_PER_ELEMENT,
			length: bytes,
			buffer: Buffer.alloc(bytes),
		});

		const doubles = new Float64Array(buffer.buffer);

		const data: number[][] = [];
		for (let i = 0; i < doubles.length; i += this.numColumns()) {
			const items = Array.from(doubles.subarray(i, i + this.numColumns()));
			data.push(items);
		}
		return data;
	}

	/**
	 * Access the row at the specified `rowIndex`. Same as `rows(rowIndex, rowIndex + 1)`.
	 *
	 * @param rowIndex - Zero-based row index to access.
	 */
	async row(rowIndex: number) {
		return (await this.rows(rowIndex, rowIndex + 1))[0];
	}

	/**
	 * The returned stream's `write` method must be called with an array whose length matches the number of columns in
	 * the table. If a row with in incorrect number of elements is provided then the stream will be destroyed unless an
	 * argument for the callback is provided. In this case, the callback is called with the error argument and the
	 * stream is not destroyed.
	 */
	createWriteStream(): Writable<number[]> {
		return TabularData.createWriteStream(this.sto, this.path, this.numColumns());
	}

	createReadStream(): Readable<number[]> {
		return TabularData.createReadStream(this.sto, this.path, this.numColumns());
	}

	[Symbol.asyncIterator](): AsyncIterator<readonly number[]> {
		return this.createReadStream()[Symbol.asyncIterator]();
	}

	/**
	 * Provides the element index for the given `rowIndex`, assuming the rows are stored in a contiguous block of memory in
	 * row-major order.
	 *
	 * Example:
	 *
	 * The following data...
	 *
	 *  rowIndex ║     Col 1 │ Col 2  │  Col 3
	 *  ═════════╬═══════════════════════════════
	 *           ║  ┌                         ┐
	 *    0      ║  │  a_11  │  a_12  │  a_13 │
	 *    1      ║  │  a_21  │  a_22  │  a_23 │
	 *    2      ║  │  a_31  │  a_32  │  a_33 │
	 *           ║  └                         ┘
	 *
	 * ...is stored in memory like this:
	 *
	 * value         ║  a_11 │ a_12 │ a_13 │ a_21 │ a_22 │ a_23 │ a_31 │ a_32 │ a_33
	 * ══════════════╬═════════════════════════════════════════════════════════════════════
	 * elementIndex  ║    0  │   1  │   2  │   3  │   4  │   5  │   6  │   7  │   8
	 *
	 *
	 * For a given `rowIndex` of 1, the function returns a value of 3.
	 *
	 * @param rowIndex - The row for which to return the element index. The element at the returned position contains the
	 *                   first item of the row.
	 *
	 */
	private elementIndex(rowIndex: number) {
		assert(rowIndex >= 0, "elementIndex: rowIndex < 0");
		assert(rowIndex <= this.numRows(), "elementIndex: rowIndex exceeds number of rows");
		return rowIndex * this.numColumns();
	}

	// private byteIndex(rowIndex: number) {
	// 	assert(rowIndex >= 0, "byteIndex: rowIndex < 0");
	// 	assert(
	// 		rowIndex <= this.numRows(),
	// 		"byteIndex: rowIndex exceeds number of rows"
	// 	);
	// 	return rowIndex * this.bytesPerRow;
	// }
}
