import assert from "assert";

import { assertUnreachable } from "@omegadot/assert";
import { isEqual } from "lodash";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import type { ParseResult } from "papaparse";
import Papa from "papaparse";

import { compositeHeaderAutomatic } from "./CompositeHeaderAutomatic";
import { makeHeadersUnique } from "./makeHeadersUnique";
import { collectPropertiesWithPathOfDeviceObject } from "../graphql/traversal/collectSamples";
import { readLastLines } from "../utils/readLastLines/readLastLines";

import type { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import type { IDatetime } from "~/lib/createDate";
import { createDate } from "~/lib/createDate";
import type { IDeviceId } from "~/lib/database/Ids";
import { parseTimeInformation } from "~/lib/datetime/parseTimeInformation";
import type { NormalizerId } from "~/lib/importWizard/normalizer";
import { applyNormalizer } from "~/lib/importWizard/normalizer";
import type { IGenericTable } from "~/lib/interface/CSVImportWizzard/IGenericTable";
import type { IColumnConfig } from "~/lib/interface/IImportWizardPreset";
import type { ITabularDataColumnDescription } from "~/lib/interface/ITabularDataColumnDescription";
import type { IProgressFn } from "~/lib/progress/IProgressReporterFn";
import { Service } from "~/lib/serviceContainer/ServiceContainer";
import { StorageEngine } from "~/lib/storage-engine";
import { createDuplex, createPipeline } from "~/lib/streams";
import type { Readable, Writable } from "~/lib/streams";

interface IImportError {
	error: string;
	warnings?: string[];
}

export interface IDataArea {
	/**
	 * Defines in which row (0-based) the header information is in.
	 *
	 * In case a number is given, then the strings in the row are simply used as-is.
	 *
	 * Optionally, so-called composite headers may be used, where the headers are prefixed with a
	 * string provided by the user.
	 * An automatic mode also exists which infers the prefix from multiple rows provided by the user.
	 *
	 * Composite headers are especially useful in cases where the column names are ambiguous.
	 */
	header: ISingleHeaderRow | ICompositeHeaderAutomatic | ICompositeHeaderExplicit;

	/**
	 * From which row (0-based, inclusive) the data of the table begins.
	 */
	body: number;
}

export interface IToGenericTableOptions {
	preview?: number;
	delimiter: string;
	dataArea: IDataArea;
	normalizers: { [columnName: string]: NormalizerId | undefined | "" };
}

export interface IToTabularDataOptions extends Omit<IToGenericTableOptions, "normalizers"> {
	decimalSeparator: string;
	columnMetadata: Record<string, IColumnConfig>;

	manualDateConfig?: { begin: IDatetime; end: IDatetime };
}

@Service(StorageEngine)
export class CSVImportWizard {
	constructor(private sto: StorageEngine) {}

	public static cleanInput(input: string) {
		return input.replace(/\0/g, "").trim();
	}

	private static timeColumnConfigured(config: IResolvedColumnConfig[]) {
		return (
			config.find((f) => {
				switch (f.columnConfig.type) {
					case "date":
					case "offset":
					case "time":
					case "datetime":
						return true;
					case "number":
						return false;
				}
			}) !== undefined
		);
	}

	private static mergeDateAndTime(
		dateColumn: IResolvedColumnConfig,
		timeColumn: IResolvedColumnConfig,
		columnMetadata: IResolvedColumnConfig[],
		dateTimeMetadata: IResolvedColumnConfig[]
	) {
		assert(dateColumn.columnConfig.type == "date" && timeColumn.columnConfig.type == "time");

		// Configure the date column to concat the time column
		dateColumn.columnConfig = {
			...dateColumn.columnConfig,
			type: "datetime",
			//columnId: "datetime", // TODO: Rename column and update independent variables of other columns
			format: `${dateColumn.columnConfig.format} ${timeColumn.columnConfig.format}`,
		};
		dateColumn.concat = timeColumn.index;

		// Remove the time column from `columnMetadata` to exclude the column from the final output
		return {
			columnMetadata: columnMetadata.filter((m) => m !== timeColumn),
			dateTimeMetadata: dateTimeMetadata.filter((m) => m !== timeColumn),
		};
	}

	/**
	 * For Step 2 and Step 3 the "preview lines" should actually contain data. To ensure this the
	 * start of the data needs to be added as an offset.
	 */
	private static calculateAdjustedPreview(options: IToGenericTableOptions | IToTabularDataOptions) {
		return options.preview !== undefined ? options.preview + options.dataArea.body : undefined;
	}

	async toCellArray(
		filePath: string,
		options: { preview?: number; delimiter: string }
	): Promise<string[][]> {
		const rows: string[][] = [];
		return new Promise((resolve, reject) => {
			let row = 0;

			// if (stream.readableLength == 0) {
			// 	reject("No readable file contents");
			// }

			const stream = this.sto.readFileStream(filePath);
			Papa.parse(stream as any, {
				preview: options.preview,
				delimiter: options.delimiter,
				// Do not attempt to convert numeric data to numbers
				dynamicTyping: false,
				// Without error callback errors will be lost
				error: reject,
				// Providing the step function enables steaming mode.
				step(result: ParseResult<string>, parser) {
					rows.push(result.data.map((c) => CSVImportWizard.cleanInput(c)));

					// When the preview option is used, we need to call abort so that the complete handler is called.
					if (options.preview !== undefined && options.preview === row + 1) {
						parser.abort();
					}
					++row;
				},
				// When in streaming mode, parse results are not available in this callback
				complete() {
					stream.destroy();
					resolve(rows);
				},
			});
		});
	}

	async toGenericTable(
		inputPath: string,
		options: IToGenericTableOptions
	): Promise<Result<IGenericTable, IImportError>> {
		return new Promise((resolve, reject) => {
			let lastHeaderLine;
			const headerInfo = options.dataArea.header;
			switch (headerInfo.type) {
				case "SingleHeaderRow":
					lastHeaderLine = headerInfo.headerRow;
					break;
				case "CompositeHeaderAutomatic":
					lastHeaderLine = Math.min(...headerInfo.headerRow);
					break;
				case "CompositeHeaderExplicit":
					return resolve(err({ error: "Explicit header moder not implemented" }));
			}

			if (lastHeaderLine >= options.dataArea.body) {
				return resolve(err({ error: "Header line must come before data body." }));
			}

			let header: string[] = [];
			const compositeHeaderAccumulator: string[][] = [];
			const body: string[][] = [];
			let row = 0;

			const stream = this.sto.createReadStream(inputPath);
			Papa.parse(stream as any, {
				preview: CSVImportWizard.calculateAdjustedPreview(options),
				delimiter: options.delimiter,
				// Do not attempt to convert numeric data to numbers
				dynamicTyping: false,
				// Without error callback errors will be lost
				error: reject,
				// Providing the step function enables steaming mode.
				step(result: ParseResult<string>, parser) {
					if (row >= options.dataArea.body) {
						if (Object.keys(options.normalizers).length === 0) {
							body.push(result.data.map((c) => CSVImportWizard.cleanInput(c)));
						} else {
							body.push(
								result.data.map((d, i) => {
									const normalizer = options.normalizers[header[i]];
									if (normalizer !== undefined && normalizer !== "") {
										return applyNormalizer(normalizer, CSVImportWizard.cleanInput(d));
									}
									return d;
								})
							);
						}
					} else if (headerInfo.type === "SingleHeaderRow" && row === headerInfo.headerRow) {
						header.push(...result.data);
					} else if (
						headerInfo.type === "CompositeHeaderAutomatic" &&
						headerInfo.headerRow.includes(row)
					) {
						compositeHeaderAccumulator.push(result.data);
					}

					// When the preview option is used, we need to call abort so that the complete handler is called.
					if (
						options.preview !== undefined &&
						CSVImportWizard.calculateAdjustedPreview(options) === row + 1
					) {
						parser.abort();
					}

					++row;
				},
				// When in streaming mode, parse results are not available in this callback
				complete() {
					stream.destroy();

					if (headerInfo.type === "CompositeHeaderAutomatic") {
						header = compositeHeaderAutomatic(compositeHeaderAccumulator).map((a) => a.join("\n"));
					}

					header = header.map((h) => CSVImportWizard.cleanInput(h));
					resolve(ok({ header, headerInternal: makeHeadersUnique(header), body }));
				},
			});
		});
	}

	/**
	 * // - Falls einzelne Zeilen nicht eingelesen werden können (zum Beispiel weil eine Zahl mitten in der Datei nicht als
	 * //   solche erkannt wird, oder wenn die Spaltenzahl nicht stimmt), dann werden die Zeilen ignoriert und gesammelt als
	 * //   Warnung angezeigt. Sofern die Anzahl an problematischen Zeilen unter einer (noch zu definierenden) Grenze liegt,
	 * //   hat der Benutzer die Möglichkeit, die Zeile zu ignorieren
	 * // - Es wird geprüft, ob Zeiteinträge streng monoton steigend sind. Wenn nein, dann wird abgebrochen. Falls das doch ein
	 * //   legitimes Eingabeformat ist, kann dies nachträglich noch implementiert werden. Diese Überprüfung verhindert auch
	 * //   das fehlerhafte Einlesen von Messdateien, die zum Zeitpunkt der Sommer/Winterzeitumstellung stattgefunden haben, da
	 * //   in (der einen Richtung) doppelte Einträge auftreten.
	 *
	 * Returns a `Promise` that resolves to an object containing the resource attachment and a list of warning strings.
	 * Warnings
	 */
	async toTabularData(
		inputPath: string,
		output: Writable<number[]>,
		options: IToTabularDataOptions,
		deviceReferenceCheck: { deviceId: IDeviceId; el: EntityLoader; schema: DrizzleSchema },
		progressFn: IProgressFn = () => {}
	): Promise<
		Result<
			{
				props: {
					numColumns: number;
					metadata: ITabularDataColumnDescription[];
					begin: Date;
					end: Date;
				};
				warnings: string[];
			},
			IImportError
		>
	> {
		// Obtain the column titles (columnIds) from the input string (the CSV) based on the preset
		const genericTable = await this.toGenericTable(inputPath, {
			...options,
			preview: 0, // No lines after header required
			normalizers: {},
		});

		if (genericTable.isErr()) {
			return err(genericTable.error);
		}
		const { headerInternal } = genericTable.value;

		const indexById = new Map<string, number>();
		const independentVariableIndices = new Set<number>();
		let dateTimeMetadata: IResolvedColumnConfig[] = [];
		let columnMetadata: IResolvedColumnConfig[] = [];

		// Ignore all headers which are skipped or undefined
		const headerWithoutSkipped = headerInternal.filter(
			(h) => options.columnMetadata[h] !== undefined && options.columnMetadata[h].type !== "skip"
		);

		for (const metadata of Object.values(options.columnMetadata)) {
			const inputIndex = headerWithoutSkipped.findIndex((h) => h === metadata.columnId);
			if (inputIndex !== -1) indexById.set(metadata.columnId, inputIndex);
		}

		for (let index = 0; index < headerInternal.length; ++index) {
			const h = headerInternal[index];
			// Can be undefined when data being imported contains columns that were not present at the time the preset
			// was created. Although the UI should prevent this situation, we perform the check for undefined here just
			// in case.
			const columnConfig: IColumnConfig | undefined = options.columnMetadata[h];
			if (columnConfig == undefined || columnConfig.type === "skip") continue;

			const resolved = { index, columnConfig };

			// Determine the independent variables in the table and save them in a separate array for efficient access
			if (columnConfig.independent) {
				for (const columnId of columnConfig.independent) {
					const index = indexById.get(columnId);
					if (index !== undefined) independentVariableIndices.add(index);
				}
			}

			switch (resolved.columnConfig.type) {
				case "date":
				case "time":
				case "datetime":
				case "offset":
					dateTimeMetadata.push(resolved);
			}

			columnMetadata.push(resolved);
		}

		const datesWithTime = dateTimeMetadata.filter(
			(d) => d.columnConfig.type == "date" && d.columnConfig.partnerColumnId !== undefined
		);
		for (const dateColumn of datesWithTime) {
			const timeColumn = dateTimeMetadata.find((d) => {
				assert(dateColumn.columnConfig.type === "date");

				return (
					d.columnConfig.type === "time" &&
					d.columnConfig.columnId === dateColumn.columnConfig.partnerColumnId
				);
			});

			if (timeColumn !== undefined) {
				const merged = CSVImportWizard.mergeDateAndTime(
					dateColumn,
					timeColumn,
					columnMetadata,
					dateTimeMetadata
				);
				columnMetadata = merged.columnMetadata;
				dateTimeMetadata = merged.dateTimeMetadata;
			}
		}

		// When a table has a date and time column, we automatically merge them together.
		// To avoid unintentional transformations, the following constraints must be met for automatic merging to take
		// effect.
		// - The table must contain exactly 2 columns that represent a date (date, time, datetime, offset)
		// - The first occurrence of such a column must be of type date
		// - The second occurrence of such a column must be of type time
		// - Both columns must have the same timezone
		// In this case, the `date` column is changed to be of type `datetime` and the `time` column is dropped.
		if (
			dateTimeMetadata.length === 2 &&
			dateTimeMetadata[0].columnConfig.type === "date" &&
			dateTimeMetadata[0].columnConfig.partnerColumnId === undefined && // Ignore columns that are part of a date-time pair
			dateTimeMetadata[1].columnConfig.type === "time" &&
			dateTimeMetadata[0].columnConfig.timezone === dateTimeMetadata[1].columnConfig.timezone
		) {
			const dateColumn = dateTimeMetadata[0];
			const timeColumn = dateTimeMetadata[1];
			const merged = CSVImportWizard.mergeDateAndTime(
				dateColumn,
				timeColumn,
				columnMetadata,
				dateTimeMetadata
			);
			columnMetadata = merged.columnMetadata;
			dateTimeMetadata = merged.dateTimeMetadata;
		}

		let tabularDataColumnDescription: ITabularDataColumnDescription[] = columnMetadata.map(
			(meta) => {
				return {
					title: meta.columnConfig.title ?? meta.columnConfig.columnId,
					columnId: meta.columnConfig.columnId,
					description: "",
					// note: date/time should be eliminated by now. It should be enough to check fo datetime
					type:
						meta.columnConfig.type === "datetime" ||
						meta.columnConfig.type === "offset" ||
						meta.columnConfig.type === "time"
							? "datetime"
							: "number",
					deviceId: meta.columnConfig.deviceId,
					unit: meta.columnConfig.unit ?? "",
					independentVariables:
						meta.columnConfig.independent?.map((columName) => {
							const index = columnMetadata.findIndex((f) => f.columnConfig.columnId === columName);
							assert(index !== -1, "Invalid independent column referenced in config object");
							return index;
						}) ?? [],
				};
			}
		);

		const endOfFileLineCount = 10;
		const lastLines = await readLastLines(this.sto, inputPath, { nLines: endOfFileLineCount });
		const endOfFile = lastLines.join("\n");
		const lastTime: number[] = new Array(columnMetadata.length)
			.fill(undefined)
			.map(() => -Infinity);

		// Parse last few lines to identify when the resource recording has ended
		let rowCount = 0;
		const endDate = await new Promise<Date>((resolve, reject) => {
			Papa.parse(endOfFile, {
				//preview: options.preview,
				delimiter: options.delimiter,
				// Do not attempt to convert numeric data to numbers
				dynamicTyping: false,
				// Without error callback errors will be lost
				error: reject,
				// Providing the step function enables steaming mode.
				step(result: ParseResult<string>) {
					for (const { columnConfig, index, concat } of dateTimeMetadata) {
						// For short files the lastLines might contain the whole file (including the
						// header). In this case we need to check if the rowCount is still within
						// the data area.
						if (lastLines.length !== endOfFileLineCount && rowCount <= options.dataArea.body) {
							continue;
						}

						let value = result.data[index];
						if (value === undefined) {
							continue;
						}

						value = CSVImportWizard.cleanInput(value);

						const normalizer = columnConfig.normalizerIds[0];
						if (normalizer) {
							value = applyNormalizer(normalizer, value);
						}

						if (
							columnConfig.type === "datetime" ||
							columnConfig.type === "offset" ||
							columnConfig.type === "time"
						) {
							if (concat !== undefined) value += ` ${result.data[concat]}`;
							try {
								if (value.trim() !== "") {
									lastTime[index] = parseTimeInformation(
										value,
										columnConfig,
										options.decimalSeparator
									);
								}
							} catch (e) {
								// Not sure what to do...
							}
						}
					}
					rowCount++;
				},
				complete: () => {
					// There is an end date for each column.
					// As of now only a single end date is required

					// TODO: In reverse order this Math.max is wrong.
					//  This could cause issues
					const maxTimestamp = Math.max(...lastTime.filter((f) => f !== undefined));
					const endDate = new Date(maxTimestamp);
					resolve(endDate);
				},
			});
		});

		const fileSize = await this.sto.size(inputPath);

		return new Promise<
			Result<
				{
					props: {
						numColumns: number;
						metadata: ITabularDataColumnDescription[];
						begin: Date;
						end: Date;
					};
					warnings: string[];
				},
				IImportError
			>
		>((resolve, reject) => {
			const warnings: string[] = [];

			// Used to assert that data is sorted correctly
			const lastX: number[] = new Array(columnMetadata.length).fill(undefined).map(() => -Infinity);
			let xOrdering: undefined | "asc" | "desc" = undefined;

			let begin = Infinity;
			let rowCount = 0;

			// The number of columns in the final TabularData file
			let numColumns = 0;

			// Detect progress by counting bytes. See also https://github.com/mholt/PapaParse/issues/321
			// for reason progress is not emitted from the step function.
			let bytesRead = 0;
			const stream: Readable<Buffer> = createPipeline(
				this.sto.createReadStream(inputPath),
				createDuplex({
					transform(chunk: Buffer) {
						bytesRead += chunk.byteLength;
						progressFn((bytesRead / fileSize) * 100, "Parsing CSV");
						return chunk;
					},
				})
			);

			Papa.parse(stream as any, {
				preview: CSVImportWizard.calculateAdjustedPreview(options),
				delimiter: options.delimiter,
				// Do not attempt to convert numeric data to numbers
				dynamicTyping: false,
				// Without error callback errors will be lost
				error: reject,
				// Providing the step function enables steaming mode.

				step(result: ParseResult<string>, parser) {
					++rowCount;

					// Make sure to call finish after each row is processed (even if it is ignored)
					// Otherwise the parser will not call the complete handler and the function
					// will never resolve/reject.
					const rowProcessingFinished = () => {
						// When the preview option is used, we need to call abort so that the complete handler is called.
						if (
							options.preview !== undefined &&
							CSVImportWizard.calculateAdjustedPreview(options) === rowCount
						) {
							parser.abort();
						}
					};

					// Begin reading data only after the row specified in options.dataArea.body
					if (rowCount <= options.dataArea.body) {
						rowProcessingFinished();
						return;
					}

					if (result.data.length !== headerInternal.length) {
						warnings.push(
							`Inconsistent columns in row ${rowCount}. Expected ${headerInternal.length} columns, but found ${result.data.length}.`
						);
						rowProcessingFinished();
						return;
					}

					const row: Array<number | undefined> = columnMetadata.map(
						({ columnConfig, index, concat }) => {
							let value = result.data[index];
							value = CSVImportWizard.cleanInput(value);

							const normalizer = columnConfig.normalizerIds[0];
							if (normalizer) {
								value = applyNormalizer(normalizer, value);
							}

							switch (columnConfig.type) {
								case "date":
								case "offset":
								case "time":
								case "datetime": {
									if (concat !== undefined) value += ` ${result.data[concat]}`;
									try {
										const time = parseTimeInformation(
											value,
											columnConfig,
											options.decimalSeparator
										);
										if (begin === Infinity) {
											begin = time;
										}
										return time;
									} catch (e) {
										warnings.push(
											`Unexpected values in row ${rowCount}. Unable to parse column ${columnConfig.columnId} to date. Found value '${value}'.`
										);
									}
									break;
								}
								case "number": {
									if (options.decimalSeparator !== ".") {
										value = value.replace(".", "").replace(options.decimalSeparator, ".");
									}

									const n = Number(value);
									if (isNaN(n)) {
										warnings.push(
											`Unexpected values in row ${rowCount}. Expected column ${columnConfig.columnId} to be of type number found '${value}' instead.`
										);
										return undefined;
									}
									return n;
								}
								default:
									assertUnreachable(columnConfig);
							}
						}
					);

					// Verify that the data is sorted
					for (const index of independentVariableIndices) {
						const value = row[index];
						if (value !== undefined) {
							if (dateTimeMetadata.length == 0) {
								break;
							}

							// Determine order if no order has been determined by now
							if (xOrdering === undefined && lastX[index] !== -Infinity) {
								xOrdering = lastX[index] < value ? "asc" : "desc";
							}

							const asc = lastX[index] <= value; // TODO: Remove <= replace with <
							const desc = !asc;

							if ((xOrdering === "asc" && !asc) || (xOrdering === "desc" && !desc)) {
								resolve(
									err({
										error: `CSVImportWizard: x-values are not in ${xOrdering}ending order or contain duplicate values (${lastX[index]} is being followed by ${value})`,
									})
								);
								return parser.abort();
							}
							lastX[index] = value;
						}
					}

					const filtered = row.filter((val): val is number => val !== undefined);
					if (row.length === filtered.length) {
						// The number of columns actually written to the TabularData file.
						numColumns = filtered.length;

						// The write method returns a boolean that indicates whether the stream wishes for the calling code to
						// wait for the 'drain' event (false) to be emitted before continuing to write additional data. Returns
						// true if the stream is ready for more data.
						if (!output.write(filtered)) {
							parser.pause();
							output.once("drain", () => {
								parser.resume();
							});
						}
					} else {
						warnings.push(`Ignoring line ${rowCount} as not all columns could be processed`);
					}

					rowProcessingFinished();
				},
				// When in streaming mode, parse results are not available in this callback
				complete() {
					progressFn(100, "Parsing CSV Done");

					// TODO: Only destroy if in preview mode. Otherwise there is no need to destroy an already ended stream.
					stream.destroy();

					// End the output stream
					output.end();

					let dateInfo =
						xOrdering === "desc"
							? { begin: endDate, end: new Date(begin) }
							: { begin: new Date(begin), end: endDate };

					// If begin is still infinity by now then no time could be parsed out of the
					// datetime column. In this case we can only continue if the user has provided
					// manual time information
					if (CSVImportWizard.timeColumnConfigured(columnMetadata)) {
						if (begin == Infinity) {
							return resolve(
								err({
									error: `Couldn't parse time information. Please check the config of your time column`,
								})
							);
						}
					} else if (options.manualDateConfig) {
						dateInfo = {
							begin: createDate(options.manualDateConfig.begin),
							end: createDate(options.manualDateConfig.end),
						};
					}

					if (!(isValidDate(dateInfo.begin) && isValidDate(dateInfo.end))) {
						return resolve(
							err({
								error:
									"Couldn't extract time information. Please check the values you've entered regarding time.",
							})
						);
					}

					collectPropertiesWithPathOfDeviceObject(
						deviceReferenceCheck.deviceId,
						deviceReferenceCheck.el,
						deviceReferenceCheck.schema,
						dateInfo.begin,
						dateInfo.end
					)
						.then(({ devices }) => {
							const columns = Object.entries(options.columnMetadata);
							for (const [name, config] of columns) {
								let pathFound = false;
								let deviceFound: IDeviceId | undefined = undefined;

								// Special treatment for the case where the device path is set to []
								// as this indicates that the root device is the source of the data
								if (isEqual(config.devicePath, [])) {
									pathFound = true;
									deviceFound = deviceReferenceCheck.deviceId;
								}

								for (const device of devices) {
									deviceFound =
										deviceFound ?? // If deviceFound is already set, don't overwrite it
										(config.deviceId === device.component.id ? device.component.id : undefined); // If the device is found in this iteration set `deviceFound` to the device id

									if (isEqual(config.devicePath, device.pathFromTopLevelDevice)) {
										pathFound = true;
									}

									if (deviceFound !== undefined) {
										break;
									}
								}

								if (config.type === "number" && config.deviceId !== undefined) {
									// Path found and device not found means the Device has changed
									if (pathFound && !deviceFound) {
										tabularDataColumnDescription = tabularDataColumnDescription.map((c) => {
											if (c.columnId === config.columnId) {
												warnings.push(
													`Device for column ${name} is different from the one in the preset.`
												);
												return {
													...c,
													deviceId: deviceFound, // Update metadata with the found device id
												};
											}

											return c;
										});
									}

									// If the device is found but the path is not, the device is not at the expected position in the component tree
									// This could potentially be an issue (for example if two devices were swapped with each other)
									if (deviceFound && !pathFound) {
										warnings.push(
											`The Device for the values in the ${name} column now has a different position in the component tree than when the preset was created. Please verify that the selected Device is the correct one.`
										);
									}

									// If the path is not available in the device tree, the information can't be used.
									if (!deviceFound && !pathFound) {
										const error = `The device referenced as source for the values in the ${name} column doesn't exist.`;
										if (options.preview !== undefined) {
											// If the preview option is used this issue is not critical
											// (as it can be fixed by the user)
											// This also allows us to return tabular data along with the
											// text of the error message
											warnings.push(error);
										} else {
											return resolve(
												err({
													error,
												})
											);
										}
									}
								}
							}

							if (
								!tabularDataColumnDescription.some(
									(column) => column.independentVariables.length > 0
								)
							) {
								warnings.push(
									"No dependent variables found. If all columns contain independent data, it is possible to import such files, but there is no way to visualize the data."
								);
							}

							return resolve(
								ok({
									props: {
										numColumns,
										metadata: tabularDataColumnDescription,
										...dateInfo,
									},
									warnings,
								})
							);
						})
						.catch(reject); // TODO: err() ?
				},
			});
		}).then(
			// Wait until output stream has closed
			(val) => output.promise().then(() => val)
		);
	}
}

/**
 * Wraps IColumnConfig with indices resolved to the appropriate columns for efficient access.
 */
interface IResolvedColumnConfig {
	/**
	 * The column index. Used to get the string value from the input.
	 */
	index: number;

	/**
	 * An index to another column that should be concatenated with the value in `index`.
	 */
	concat?: number;

	columnConfig: Exclude<IColumnConfig, { type: "skip" }>;
}

interface ISingleHeaderRow {
	type: "SingleHeaderRow";
	/**
	 * Row which contains the header names
	 */
	headerRow: number;
}

interface ICompositeHeaderAutomatic {
	type: "CompositeHeaderAutomatic";
	/**
	 * Rows which are considered to determine the composite header
	 */
	headerRow: number[];
}

interface ICompositeHeaderExplicit {
	type: "CompositeHeaderExplicit";
	/**
	 * Group of columns sharing the same prefix
	 */
	columns: IColumnGroup[];
}

// function normalizeColumnGroups(header: number[] | IColumnGroup[]): IColumnGroup[] {}

interface IColumnGroup {
	columnPrefix: string;
	columnIndices: number[];
}

/**
 * Validates if the given date object represents a valid date.
 * Call like `new Date("foo")` return a date object, but the "encapsulated" date is invalid.
 */
function isValidDate(d: Date) {
	return !isNaN(d.getTime());
}
