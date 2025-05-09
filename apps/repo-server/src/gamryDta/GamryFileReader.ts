// https://github.com/bcliang/gamry-parser/blob/master/gamry_parser/gamryparser.py
// Curve Types: https://www.gamry.com/Framework%20Help/HTML5%20-%20Tripane%20-%20Audience%20A/Content/EIS/Tutorials/Tutorial%201--Running%20Standard%20EIS/12%20Navigate%20the%20Curve%20List.htm
// https://mmrc.caltech.edu/Gamry/manuals/Framework%20help.pdf

import assert from "assert";
import { Buffer } from "buffer";
import { resolve } from "path";

import type { Result } from "neverthrow";
import { err } from "neverthrow";
import { ok } from "neverthrow";

import type { Logger } from "~/lib/logger/Logger";
import { SilentLogger } from "~/lib/logger/SilentLogger";
import type { StorageEngine } from "~/lib/storage-engine";
import type { Duplex, Readable } from "~/lib/streams";
import { createDuplex, createPipeline } from "~/lib/streams";

export type GamryDtaParserEvents =
	| {
			type: "metadata";
			data: { metadata: TGamryMetadata; auxData: string[]; displayNames: TDisplayNames };
	  }
	| { type: "minmax"; min: (undefined | number)[]; max: (undefined | number)[] }
	| { type: "next"; tableType: string; expectedCurveLength?: number } // Indicates that the next table is starting
	| { type: "headers"; data: string[] }
	| { type: "units"; data: string[] }
	| { type: "data"; data: (number | string)[] };

export type TGamryMetadata = Record<
	string,
	string | number | boolean | ITwoParamValue | IMultiparamValue | TVariableAndUnitsValue
>;

export class GamryInvalidFileHeader extends Error {
	constructor(message?: string) {
		super(message ?? "This file does not start with the expected keyword ('EXPLAIN')");
		this.name = "InvalidFileHeader";
	}
}

type TDisplayNames = Map<string, string>;

/**
 * Represents a value tagged as "MULTIPARAM" type
 */
interface IMultiparamValue {
	values: { value: string; desc: string }[];
	label: string;
}

/**
 * Represents a value tagged as "TWOPARAM" type
 */
interface ITwoParamValue {
	enable: boolean;
	start: number;
	end: number;
}

/**
 * Represents a value tagged as "VARIABLEANDUNITS" type
 */
type TVariableAndUnitsValue = {
	value: string;
	unit: string;
}[];

/**
 * Wrapper around the GamryReader which reads the file using the StorageEngine
 * and transforms it into a readable stream of lines ready for consumption
 * by the GamryReader.
 */
export class GamryFileReader {
	constructor(private sto: StorageEngine, private path: string, private logger?: Logger) {}

	public async parse(options: IGamryReaderOptions = {}) {
		const lr = await LineReader.createReadStream(this.sto, this.path);
		const gr = new GamryReader({ ...options, logger: this.logger });
		return gr.createReadable(lr);
	}
}

const readFloat = (str: string): number => Number.parseFloat(str);
const readInt = (str: string): number => Number.parseInt(str, 10);

enum Mode {
	PARSE_GAMRY_INTRO = "PARSE_GAMRY_INTRO", // Consume the file intro (the first line which should be "EXPLAIN")
	PARSE_GAMRY_HEADER = "PARSE_GAMRY_HEADER", // Initial state
	PARSE_TABLE = "PARSE_TABLE", // Wait for the start of the next table (the keyword "TABLE", the table type, and optionally the length indicator)
	PARSE_TABLE_HEADER = "PARSE_TABLE_HEADER", // Wait for the header of the table (column names)
	PARSE_TABLE_UNITS = "PARSE_TABLE_UNITS", // Wait for the units of the table (column units)
	PARSE_TABLE_DATA = "PARSE_TABLE_DATA", // Wait for the actual data of the table
}

interface IGamryReaderOptions {
	/**
	 * Min max calculation is used to calculate the min and max values of each column
	 * This feature
	 */
	minMaxCalculation?: boolean;

	/**
	 * If true, the parser will throw an error if it encounters a value with an unsupported type
	 * in the metadata section. If false, the parser will return the line as part of the "auxData"
	 * array
	 */
	// throwOnUnsupportedValueType?: boolean;

	logger?: Logger;
}
export class GamryReader {
	private mode: Mode;
	private header: string[];

	private options: IGamryReaderOptions;

	private min: (undefined | number)[] = [];
	private max: (undefined | number)[] = [];

	private logger: Logger;

	constructor(options: IGamryReaderOptions = {}) {
		this.mode = Mode.PARSE_GAMRY_INTRO;
		this.header = [];

		this.options = {
			// throwOnUnsupportedValueType: options.throwOnUnsupportedValueType ?? false, // Default to false
			minMaxCalculation: options.minMaxCalculation ?? false, // Default to false
		};

		this.logger = options.logger ?? new SilentLogger();
	}

	public createReadable(lines: Readable<string>) {
		const b: Duplex<string, GamryDtaParserEvents> = createDuplex({
			transform: (
				chunk: string,
				cb: (err: null | Error, data?: GamryDtaParserEvents) => void
			): void => {
				chunk = chunk.toString(); // ???

				this.logger.debug(`${this.mode}\t${chunk}`);
				this.parseLine(chunk).match(
					(data) => {
						if (data) {
							data.forEach((d) => cb(null, d));
						}
					},
					(e) => cb(e)
				);
			},

			streamEnd: (
				// chunk: typeof streamEnd,
				cb: (err: null | Error, data?: GamryDtaParserEvents) => void
			): void => {
				if (this.mode !== Mode.PARSE_TABLE_DATA) {
					this.logger.info(`Mode on exit: ${this.mode}`);
					cb(new Error("Unexpected end of file"));
				}

				cb(null, { type: "minmax", min: this.min, max: this.max });
			},
		});

		return createPipeline(lines, b);
	}

	private addHeaderLine(string: string) {
		this.header.push(string);
	}

	public parseHeader() {
		const metadata: TGamryMetadata = {};
		const displayNames: TDisplayNames = new Map();

		// This is used to store additional data that we cannot parse right now
		const auxData: string[] = [];

		for (let i = 0; i < this.header.length; i++) {
			const line = this.header[i];
			const parts = line.split("\t");

			// Most of the header lines have 3 parts (name, type, value)
			const propertyName = parts[0].toLowerCase();
			const propertyType = parts[1];
			const propertyValue = parts[2];

			// The last part is a human readable name for the property
			const propertyDisplayName = parts[parts.length - 1];

			// Some properties have multiple lines, so we need to read the next N lines
			// Right now this is only used for the "NOTES" property
			// The python implementation indicates that there is also a "OCVCURVE" property,
			// but it does not seem to be used in the example data
			// I think the "OCVCURVE" property is used to indicate that there is data in a separate TSV
			// file.
			const readNextNLines = (n: number): string[] => {
				const lines = [];
				for (let j = 0; j < n; j++) {
					lines.push(this.header[i + j]);
				}

				i += n;
				return lines;
			};

			if (i == 0) {
				assert(parts[0] === "TAG", "Expected experiment TAG");
				metadata["tag"] = parts[1];
				displayNames.set("tag", propertyDisplayName);
			} else if (["LABEL", "PSTAT"].includes(propertyType)) {
				metadata[propertyName] = propertyValue;
				displayNames.set(propertyName, propertyDisplayName);
			} else if (["QUANT", "IQUANT", "POTEN"].includes(propertyType)) {
				metadata[propertyName] = readFloat(propertyValue);
				displayNames.set(propertyName, propertyDisplayName);
			} else if (["IQUANT", "SELECTOR"].includes(propertyType)) {
				metadata[propertyName] = readInt(propertyValue);
				displayNames.set(propertyName, propertyDisplayName);
			} else if (propertyType === "TOGGLE") {
				metadata[propertyName] = propertyValue == "T";
				displayNames.set(propertyName, propertyDisplayName);
			} else if (propertyType === "TWOPARAM") {
				metadata[propertyName] = {
					enable: parts[2] == "T",
					start: parseFloat(parts[3]),
					end: parseFloat(parts[4]),
				};
				displayNames.set(propertyName, propertyDisplayName);
			} else if (propertyType === "NOTES") {
				const noteLength = readInt(parts[2]);
				displayNames.set(propertyName, propertyDisplayName);

				i++; // Skip the "NOTES" line (TODO: Is this correct?)
				metadata[propertyName] = readNextNLines(noteLength)
					.map((line) => line.trim())
					.join("\n");
			} else if (propertyType === "VARIABLEANDUNITS") {
				// Strip begin (tag, type) and end (the label)
				metadata[propertyName] = GamryReader.parseVariableAndUnitsValue(parts.slice(2, -1));
				displayNames.set(propertyName, propertyDisplayName);
			} else if (propertyType === "MULTIPARAM") {
				// Strip begin (tag, type)
				metadata[propertyName] = GamryReader.parseMultiparam(parts.slice(2));
				displayNames.set(propertyName, propertyDisplayName);
			} else if (propertyType === "AESELECTOR") {
				auxData.push(line);
			} else {
				throw new Error(
					`Unknown property type: ${JSON.stringify({ propertyType, propertyName, propertyValue })}`
				);
			}
		}

		return { metadata, auxData, displayNames };
	}

	private static parseMultiparam(valueString: string[]): IMultiparamValue {
		const values = [];

		// Calculate "vector" length
		// Lines are formatted like this
		// MULTIPARAM $X_1 $X_2 ... $X_n $DESCRIPTION_LABEL $DESCRIPTION_VALUE_1 $DESCRIPTION_VALUE_2 ... $DESCRIPTION_VALUE_n
		// This means that the each MULTIPARAM line contains n*2 + 1 elements (without counting the MULTIPARAM keyword)
		const vectorLength = (valueString.length - 1) / 2;

		assert(Number.isInteger(vectorLength), "Unable to parse MULTIPARAM line");

		const labelPosition = vectorLength;

		for (let i = 0; i < vectorLength; i++) {
			const value = valueString[i];

			// + vectorLength (skip the values)
			// + 1 (skip the label)
			const desc = valueString[i + vectorLength + 1];
			values.push({ value, desc });
		}

		return { label: valueString[labelPosition], values };
	}

	private static parseVariableAndUnitsValue(valueString: string[]): TVariableAndUnitsValue {
		const variables = [];

		for (let i = 0; i < valueString.length; i = i + 2) {
			const value = valueString[i];
			const unit = valueString[i + 1];
			variables.push({ value, unit });
		}

		return variables;
	}

	private parseLine(chunk: string): Result<GamryDtaParserEvents[] | undefined, Error> {
		let expectedCurveLength: undefined | number = undefined;

		if (this.mode === Mode.PARSE_GAMRY_INTRO) {
			if (chunk.trim() !== "EXPLAIN") {
				return err(new GamryInvalidFileHeader());
			}
			this.mode = Mode.PARSE_GAMRY_HEADER;
			return ok(undefined);
		}

		if (this.mode === Mode.PARSE_GAMRY_HEADER) {
			// Read all lines until we reach the first line that contains "TABLE"
			// This line indicates the end of the header
			if (!chunk.trim().includes("TABLE")) {
				this.addHeaderLine(chunk); // Continue to read the header lines
				return ok(undefined);
			} else {
				// If the line contains "TABLE", then we have reached the end of the header
				// This means that all header lines have been read and the parsing can begin
				try {
					const metadata = this.parseHeader();
					this.mode = Mode.PARSE_TABLE;

					const events: GamryDtaParserEvents[] = [];
					events.push({ type: "metadata", data: metadata });

					const x = this.parseLine(chunk)._unsafeUnwrap();
					if (x) {
						events.push(...x);
					}
					return ok(events);

					// return ok([{ type: "metadata", data: metadata }],;
				} catch (e) {
					return err(e as Error);
				}
			}
		}

		if (this.mode === Mode.PARSE_TABLE) {
			const parts = chunk.split("\t");
			assert(parts[1].trim().includes("TABLE"));

			const type = parts[0];
			const tableLengthIndicator = parts[2];
			const tableLengthIndicatorInt = readInt(tableLengthIndicator);
			expectedCurveLength = Number.isNaN(tableLengthIndicatorInt)
				? undefined
				: tableLengthIndicatorInt;

			const events: GamryDtaParserEvents[] = [];

			if (this.options.minMaxCalculation) {
				if (this.min.length > 0 || this.max.length > 0) {
					events.push({ type: "minmax", min: this.min, max: this.max });
					this.min = [];
					this.max = [];
				}
			}

			this.mode = Mode.PARSE_TABLE_HEADER;
			return ok(events.concat([{ type: "next", tableType: type, expectedCurveLength }]));
			// }
		} else if (this.mode === Mode.PARSE_TABLE_HEADER) {
			const header = chunk.trim().split("\t");
			this.mode = Mode.PARSE_TABLE_UNITS;
			return ok([{ type: "headers", data: header }]);
		} else if (this.mode === Mode.PARSE_TABLE_UNITS) {
			const units = chunk.trim().split("\t");
			this.mode = Mode.PARSE_TABLE_DATA;
			return ok([{ type: "units", data: units }]);
		} else if (this.mode === Mode.PARSE_TABLE_DATA) {
			if (chunk.trim().includes("TABLE")) {
				// Detected the start of a new table. Switch state to PARSE_TABLE and reparse the line
				// in that state
				this.mode = Mode.PARSE_TABLE;
				return this.parseLine(chunk);
			} else {
				const data: (string | number)[] = chunk
					.trim()
					.split("\t")
					.map((s) => {
						const n = Number.parseFloat(s);
						// Most of the data is numeric, but there often is a Over column (Overload flags)
						// field with the unit "bits" which contains non-numeric values
						// If all characters are periods "." then everything is fine
						// If the string contains characters it indicates that an overload was detected
						return isNaN(n) ? s : n;
					});

				if (this.options.minMaxCalculation) {
					for (let i = 0; i < data.length; i++) {
						const column = data[i];
						if (typeof column === "number") {
							this.min[i] =
								this.min[i] === undefined
									? column
									: Math.min(this.min[i] ?? Number.MAX_SAFE_INTEGER, column);

							this.max[i] =
								this.max[i] === undefined
									? column
									: Math.max(this.max[i] ?? Number.MIN_SAFE_INTEGER, column);
						}
					}
				}

				return ok([{ type: "data", data }]);
			}
		}

		//return err(new Error("Invalid parser state"));
		return ok(undefined);
	}
}

class LineReader {
	static async createReadStream(
		sto: StorageEngine,
		path: string | string[]
	): Promise<Readable<string>> {
		const completePath = Array.isArray(path) ? resolve(...path) : path;

		const size = await sto.size(completePath);
		let parsedSize = 0;

		let buffer: Buffer | undefined;

		const a = sto.createReadStream(completePath);
		const b: Duplex<string | Buffer, string> = createDuplex({
			transform: (chunk: Buffer | string, cb: (err: null | Error, data?: string) => void): void => {
				if (typeof chunk === "string") {
					return cb(new Error("Received string but expected Buffer."));
				}

				buffer = buffer ? Buffer.concat([buffer, chunk]) : chunk;

				let i;
				let bytesRead = 0;
				for (i = 0; i < buffer.length; i += 1) {
					if (buffer[i] == 0xa) {
						const str = buffer.subarray(bytesRead, i).toString("utf-8");
						cb(null, str);
						bytesRead = i + 1;
					}
				}

				// Save any remaining bytes for the next iteration so it can be merged with a new chunk
				buffer = buffer.subarray(bytesRead);

				parsedSize += bytesRead;

				// If parsedSize + buffer.length == size, then we have read the entire file and
				// the chunk consists of the last line (without trailing newline)
				if (parsedSize + buffer.length == size) {
					cb(null, buffer.toString("utf-8"));
				}
			},
		});

		return createPipeline(a, b);
	}
}

export enum OverflowTypes {
	TIMING = 1,
	POTENTIAL_OVERLOAD,
	CA_OVERLOAD,
	CA_OVERLOAD_H,
	I_OVERLOAD,
	I_OVERLOAD_H,
	SETTELING_PROBLEM_HARDWARE,
	SETTELING_PROBLEM_SOFTWARE,
	ADC_RANGE_I,
	ADC_RANGE_V,
	ADC_AUX,
	RAW_DATA_QUEUE_FILLED,
	PROCESSING_QUEUE_FILLED,
}

export class OverflowParser {
	public static isOverflowFlagSet(bitfield: string, position: OverflowTypes): boolean {
		return !!(OverflowParser.parseBitfield(bitfield) & OverflowParser.calculateBitmask(position));
	}

	private static calculateBitmask(position: OverflowTypes) {
		const calculateFlagNumber = new Array(13)
			.fill(undefined)
			.map((_, i) => (i + 1 == position ? 1 : 0));
		return parseInt(calculateFlagNumber.join(""), 2);
	}

	/**
	 * Parse the bitfield string into a number
	 * The bitfield string consist of characters and periods
	 *
	 * The periods are interpreted as 0 (not set)
	 * All other characters are interpreted as 1 (set)
	 *
	 * @param bitfield
	 */
	private static parseBitfield(bitfield: string): number {
		const binary = bitfield
			.split("")
			.map((c) => (c === "." ? 0 : 1))
			.join("")
			.padEnd(13, "0");

		return parseInt(binary, 2);
	}
}
