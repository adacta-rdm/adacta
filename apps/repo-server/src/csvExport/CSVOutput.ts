interface ICSVOptions {
	delimiter: string;
	quote: string;
	lineTerminator: string;
}

const defaultOptions: ICSVOptions = {
	delimiter: ",",
	quote: '"',
	lineTerminator: "\n",
};

type TInputColumnType = string | number;

export class CSVOutput {
	private options: ICSVOptions;

	constructor(options?: Partial<ICSVOptions>) {
		this.options = { ...defaultOptions, ...options };
	}

	/**
	 * Combines a stream of data with a header and turns it into a stream of CSV formatted text
	 * @param data stream of data where each chunk is an array which includes all column values of a
	 * row
	 * @param header array of column names
	 * @param options to customize the formatting of the output
	 */
	public static withHeader(
		sourceStream: ReadableStream<TInputColumnType[]>,
		header: string[],
		options?: Partial<ICSVOptions>
	) {
		// Transformation stream that adds the header
		const addHeaderTransformationStream = new TransformStream<number[], (string | number)[]>({
			start(controller) {
				controller.enqueue(header); // Start with the header
			},
			transform(chunk, controller) {
				controller.enqueue(chunk); // Enqueue all other chunks as they come in
			},
		});

		return sourceStream
			.pipeThrough(addHeaderTransformationStream)
			.pipeThrough(new CSVOutput(options).transformStream())
			.pipeThrough(new TextEncoderStream());
	}

	private transformStream() {
		const transform: TransformerTransformCallback<TInputColumnType[], string> = (
			chunk,
			controller
		) => {
			controller.enqueue(
				chunk.map((chunk) => this.processColumn(chunk)).join(this.options.delimiter)
			);
			controller.enqueue(this.options.lineTerminator);
		};

		return new TransformStream<TInputColumnType[], string>({
			transform,
		});
	}

	/**
	 * Helper function that:
	 * 	- Escapes characters if needed
	 * 	- Adds quotes if needed
	 *
	 * RFC4180 states 'Fields containing line breaks (CRLF), double quotes, and commas should be
	 * enclosed in double-quotes'
	 * 'If double-quotes are used to enclose fields, then a double-quote appearing inside a field
	 * must be escaped by preceding it with another double quote.'
	 * https://datatracker.ietf.org/doc/html/rfc4180
	 *
	 * The following code assumes that in a more generalized version that the following 3 characters
	 * must be escaped
	 * - The char that is used to terminate lines
	 * - The char that is used as delimiter between fields
	 * - The char that is used to enclose fields
	 *
	 *  The following character must be escaped by preceding it with the same character if it apears
	 * in the field:
	 * - The char that is used to enclose fields
	 *
	 * @param column
	 * @private
	 */
	private processColumn(column: TInputColumnType) {
		let string = `${column}`;

		// Add inner escape characters if needed
		const charsToEscape = [this.options.quote];
		const regex = new RegExp(`[${charsToEscape.join("")}]`, "g");
		string = string.replaceAll(regex, (match) => `${this.options.quote}${match}`);

		// Add outer escape characters if needed
		if (
			string.includes(this.options.delimiter) ||
			string.includes(this.options.quote) ||
			string.includes(this.options.lineTerminator)
		) {
			string = `${this.options.quote}${string}${this.options.quote}`;
		}

		return string;
	}
}
