import { deepMerge } from "@typescript-eslint/utils/dist/eslint-utils";
import moment from "moment-timezone";
import type { PartialDeep } from "type-fest";
import { vi, describe, test, expect, beforeEach } from "vitest";

import type { collectPropertiesWithPathOfDeviceObject } from "../../graphql/traversal/collectSamples";
import type { EntityLoader } from "../../services/EntityLoader";
import type { IToTabularDataOptions } from "../CSVImportWizard";
import { CSVImportWizard } from "../CSVImportWizard";

import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import { createIDatetime } from "~/lib/createDate";
import type { IDeviceId } from "~/lib/database/Ids";
import { mkdirTmp } from "~/lib/fs";
import type { IColumnConfig } from "~/lib/interface/IImportWizardPreset";
import { FileSystemStorageEngine } from "~/lib/storage-engine";
import type { StorageEngine } from "~/lib/storage-engine";
import { TabularData } from "~/lib/tabular-data";

const example = [
	["a", "b", "c"],
	["1", "2", "3"],
	["4", "5", "6"],
];

const basePath = "apps/repo-server/src/csvImportWizard/__tests__/exampleData";

type TMockReturn = ReturnType<typeof collectPropertiesWithPathOfDeviceObject>;
vi.mock("../../graphql/traversal/collectSamples", () => ({
	collectPropertiesWithPathOfDeviceObject: (): TMockReturn => {
		const x: Awaited<TMockReturn> = {
			devices: [
				{
					component: { id: "EXISTING_ID" as IDeviceId },
					pathFromTopLevelDevice: ["root", "EXISTING_PATH"],
					installDate: new Date(0),
					removeDate: undefined,
				},
			],
			samples: [],
		};
		return Promise.resolve(x);
	},
}));
// The arguments passed as part of the deviceReferenceCheck object are forwarded to the
// collectPropertiesWithPathOfDeviceObject function which is used to get the device tree.
// To make writing tests easier, we mock the function and simply return a set of devices.
const deviceReferenceCheck = {
	el: {} as EntityLoader,
	schema: {} as DrizzleSchema,
	deviceId: "123" as IDeviceId,
};

async function toTabularDataTestHelper(
	sto: StorageEngine,
	inputPath: string,
	preset: IToTabularDataOptions,
	expectedColumns: number
) {
	const wizard = new CSVImportWizard(sto);

	const stoTmp = new FileSystemStorageEngine(await mkdirTmp());
	const filename = "test.rtd";
	const writable = TabularData.createWriteStream(stoTmp, filename, expectedColumns);

	const result = (
		await wizard.toTabularData(inputPath, writable, preset, deviceReferenceCheck)
	)._unsafeUnwrap();

	const { props } = result;

	expect(props.numColumns).toBe(expectedColumns);

	const td = await TabularData.open(stoTmp, filename, expectedColumns);

	return { props, td, result };
}

describe("CSVImportWizard", () => {
	let sto: StorageEngine;
	beforeEach(() => {
		sto = new FileSystemStorageEngine(basePath);
	});

	describe("#toCellArray", () => {
		test("returns array of array of strings", async () => {
			const a = new CSVImportWizard(sto);
			const b = await a.toCellArray("Test.csv", { delimiter: "|" });

			expect(b).toEqual(example);
		});

		test("preview option", async () => {
			const a = new CSVImportWizard(sto);
			const b = await a.toCellArray("Test.csv", { delimiter: "|", preview: 1 });

			expect(b).toEqual([example[0]]);
		});
	});

	describe("#toGenericTable", () => {
		test("trims headers", async () => {
			const a = new CSVImportWizard(sto);
			const b = await a.toGenericTable("NonTrimmedHeader.csv", {
				delimiter: ",",
				dataArea: { header: { type: "SingleHeaderRow", headerRow: 0 }, body: 1 },
				normalizers: {},
			});

			expect(b._unsafeUnwrap().header).toEqual(["a", "b", "c"]);
		});

		test("single header row", async () => {
			const a = new CSVImportWizard(sto);
			const b = await a.toGenericTable("Test.csv", {
				delimiter: "|",
				dataArea: { header: { type: "SingleHeaderRow", headerRow: 0 }, body: 1 },
				normalizers: {},
			});

			expect(b._unsafeUnwrap()).toEqual({
				header: example[0],
				headerInternal: example[0],
				body: [example[1], example[2]],
			});
		});

		test("preview option", async () => {
			const a = new CSVImportWizard(sto);
			const b = (
				await a.toGenericTable("Test.csv", {
					delimiter: "|",
					preview: 1,
					dataArea: { header: { type: "SingleHeaderRow", headerRow: 0 }, body: 1 },
					normalizers: {},
				})
			)._unsafeUnwrap();

			expect(b).toEqual({
				header: example[0],
				headerInternal: example[0],
				body: [["1", "2", "3"]],
			});
		});

		/*
        If the last header column isn't ignored when it is empty then the composite feature will
        make up additional headers (which shouldn't be there)
         */
		test("remove last header column if empty", async () => {
			const a = new CSVImportWizard(sto);
			const b = await a.toGenericTable("TrimEmptyHeader.csv", {
				delimiter: ",",
				preview: 3,
				dataArea: { header: { type: "CompositeHeaderAutomatic", headerRow: [0, 1] }, body: 2 },
				normalizers: {},
			});
			expect(b._unsafeUnwrap().header).toEqual(["a\nx", "b", "c\ny"]);
		});
	});

	describe("#toTabularData", () => {
		test("converts 'offset' columns", async () => {
			const wizard = new CSVImportWizard(sto);
			const conversionFactor = 1e3;
			const tmpDir = await mkdirTmp();
			const filename = "test-offset.rtd";
			const stoTmp = new FileSystemStorageEngine(tmpDir);
			const writable = TabularData.createWriteStream(stoTmp, filename);

			const { props } = (
				await wizard.toTabularData(
					"OffsetColumn.csv",
					writable,
					{
						delimiter: ",",
						dataArea: { header: { type: "SingleHeaderRow", headerRow: 0 }, body: 1 },
						columnMetadata: {
							x: {
								columnId: "x",
								title: "x",
								type: "offset",
								conversionFactor: conversionFactor,
								startDate: 0,
								timezone: "Europe/Berlin",
								normalizerIds: [],
							},
						},
						decimalSeparator: ".",
					},
					deviceReferenceCheck
				)
			)._unsafeUnwrap();

			const td = await TabularData.open(stoTmp, filename, 1);
			const dayInMs = 24 * 60 * 60 * 1000;

			expect(td.numRows()).toBe(3);
			expect(await td.row(0)).toEqual([0]);
			expect(await td.row(1)).toEqual([dayInMs]);
			expect(await td.row(2)).toEqual([2 * dayInMs]);
			expect(props.begin.getTime()).toBe(0);
			expect(props.end.getTime()).toBe(172800 * conversionFactor);
		});

		test("Extracts metadata", async () => {
			const wizard = new CSVImportWizard(sto);

			const stoTmp = new FileSystemStorageEngine(await mkdirTmp());

			const filename = "test.rtd";
			const writable = TabularData.createWriteStream(stoTmp, filename, 2);

			const result = await wizard.toTabularData(
				"Test.csv",
				writable,
				{
					delimiter: "|",
					dataArea: { header: { type: "SingleHeaderRow", headerRow: 0 }, body: 1 },
					columnMetadata: {
						a: {
							columnId: "a",
							title: "a",
							type: "number",
							normalizerIds: [],
						},
						c: {
							columnId: "c",
							title: "c",
							type: "number",
							normalizerIds: [],
							independent: ["a"],
						},
					},
					decimalSeparator: ".",
					manualDateConfig: {
						begin: createIDatetime(new Date(0)),
						end: createIDatetime(new Date(1)),
					},
				},
				deviceReferenceCheck
			);

			const { props } = result._unsafeUnwrap();

			const td = await TabularData.open(stoTmp, filename, 2);

			expect(td.numRows()).toBe(2);
			expect(await td.row(0)).toEqual([1, 3]);
			expect(props.metadata.map((m) => m.title)).toEqual(["a", "c"]);
		});

		test("merges 'date' and 'time' columns into one", async () => {
			const wizard = new CSVImportWizard(sto);

			const stoTmp = new FileSystemStorageEngine(await mkdirTmp());
			const filename = "test.rtd";
			const writable = TabularData.createWriteStream(stoTmp, filename, 2);

			const { props } = (
				await wizard.toTabularData(
					"DateTimeColumn.csv",
					writable,
					{
						delimiter: ",",
						dataArea: { header: { type: "SingleHeaderRow", headerRow: 0 }, body: 1 },
						columnMetadata: {
							date: {
								columnId: "date",
								title: "date",
								type: "date",
								format: "YYYY-MM-DD",
								timezone: "Europe/Berlin",
								normalizerIds: [],
							},
							time: {
								columnId: "time",
								title: "time",
								type: "time",
								format: "hh:mm:ss",
								timezone: "Europe/Berlin",
								normalizerIds: [],
							},
							y1: {
								columnId: "y1",
								title: "y1",
								type: "number",
								normalizerIds: [],
								independent: ["date"], // <- Note that we need to refer to the first of the two columns that are merged because the second is dropped from the final ITabularData.
							},
						},
						decimalSeparator: ".",
					},
					deviceReferenceCheck
				)
			)._unsafeUnwrap();

			const td = await TabularData.open(stoTmp, filename, 2);

			expect(td.numRows()).toBe(3);
			const format = "YYYY-MM-DDhh:mm:ss";
			const timezone = "Europe/Berlin";

			expect(props.metadata[0].type).toBe("datetime");
			expect(props.metadata[1].independentVariables).toEqual([0]);

			expect(await td.row(0)).toEqual([
				moment.tz("1970-01-0100:00:01", format, timezone).toDate().getTime(),
				0,
			]);
			expect(await td.row(1)).toEqual([
				moment.tz("1970-01-0100:00:02", format, timezone).toDate().getTime(),
				1,
			]);
			expect(await td.row(2)).toEqual([
				moment.tz("1970-01-0201:00:00", format, timezone).toDate().getTime(),
				2,
			]);
		});

		describe("supports multiple date columns", () => {
			const loadMultipleTimes = async (columMetadata: Record<string, IColumnConfig>) => {
				return toTabularDataTestHelper(
					sto,
					"MultipleTimes.csv",
					{
						delimiter: ",",
						dataArea: { header: { type: "SingleHeaderRow", headerRow: 0 }, body: 1 },
						columnMetadata: columMetadata,
						decimalSeparator: ".",
					},
					3
				);
			};

			test("supports time columns which are relative to an offset", async () => {
				const { td, props } = await loadMultipleTimes({
					Date: {
						columnId: "Date",
						title: "Date",
						type: "date",
						format: "DD.MM.YY",
						timezone: "Europe/Berlin",
						normalizerIds: [],
						partnerColumnId: "Time",
					},
					Time: {
						columnId: "Time",
						title: "Time",
						type: "time",
						format: "hh:mm:ss",
						timezone: "Europe/Berlin",
						normalizerIds: [],
						partnerColumnId: "Date",
					},
					Time2: {
						columnId: "Time2",
						title: "Time2",
						type: "time",
						format: "hh:mm:ss",
						timezone: "Europe/Berlin",
						normalizerIds: [],
						startDate: new Date("2024-01-01").getTime(),
					},
					Value: {
						columnId: "Value",
						title: "Value",
						type: "number",
						normalizerIds: [],
						independent: ["Date"], // <- Note that we need to refer to the first of the two columns that are merged because the second is dropped from the final ITabularData.
					},
				});

				expect(props.metadata[0].type).toBe("datetime");
				expect(props.metadata[1].type).toBe("datetime");
				expect(props.metadata[2].type).toBe("number");

				const format = "YYYY-MM-DD hh:mm:ss";
				const timezone = "Europe/Berlin";

				expect(await td.row(0)).toEqual([
					moment.tz("2024-01-01 12:12:01", format, timezone).toDate().getTime(), // Time2 + Offset
					moment.tz("2024-01-01 10:01:01", format, timezone).toDate().getTime(), // Date + Time
					10,
				]);

				expect(await td.row(1)).toEqual([
					moment.tz("2024-01-01 12:12:02", format, timezone).toDate().getTime(),
					moment.tz("2024-01-01 10:02:02", format, timezone).toDate().getTime(),
					20,
				]);
			});

			test("merges multiple 'date' and 'time' columns into multiple 'datetime' columns", async () => {
				const { td, props } = await loadMultipleTimes({
					Date: {
						columnId: "Date",
						title: "Date",
						type: "date",
						format: "DD.MM.YY",
						timezone: "Europe/Berlin",
						normalizerIds: [],
						partnerColumnId: "Time",
					},
					Time: {
						columnId: "Time",
						title: "Time",
						type: "time",
						format: "hh:mm:ss",
						timezone: "Europe/Berlin",
						normalizerIds: [],
						partnerColumnId: "Date",
					},
					Date2: {
						columnId: "Date2",
						title: "Date2",
						type: "date",
						format: "DD.MM.YY",
						timezone: "Europe/Berlin",
						normalizerIds: [],
						partnerColumnId: "Time2",
					},
					Time2: {
						columnId: "Time2",
						title: "Time2",
						type: "time",
						format: "hh:mm:ss",
						timezone: "Europe/Berlin",
						normalizerIds: [],
						partnerColumnId: "Date2",
					},
					Value: {
						columnId: "Value",
						title: "Value",
						type: "number",
						normalizerIds: [],
						independent: ["Date"], // <- Note that we need to refer to the first of the two columns that are merged because the second is dropped from the final ITabularData.
					},
				});

				expect(props.metadata[0].type).toBe("datetime");
				expect(props.metadata[1].type).toBe("datetime");
				expect(props.metadata[2].independentVariables).toEqual([0]);

				expect(td.numRows()).toBe(4);
				const format = "YYYY-MM-DD hh:mm:ss";
				const timezone = "Europe/Berlin";

				expect(await td.row(0)).toEqual([
					moment.tz("2024-01-01 10:01:01", format, timezone).toDate().getTime(),
					moment.tz("2024-02-02 12:12:01", format, timezone).toDate().getTime(),
					10,
				]);

				expect(await td.row(1)).toEqual([
					moment.tz("2024-01-01 10:02:02", format, timezone).toDate().getTime(),
					moment.tz("2024-02-02 12:12:02", format, timezone).toDate().getTime(),
					20,
				]);

				expect(await td.row(2)).toEqual([
					moment.tz("2024-01-01 10:30:03", format, timezone).toDate().getTime(),
					moment.tz("2024-02-02 12:12:03", format, timezone).toDate().getTime(),
					30,
				]);
			});
		});

		describe("ignores erroneous lines within body and generates warning", () => {
			const testFile = async (fileName: string): Promise<[TabularData, string[]]> => {
				const wizard = new CSVImportWizard(sto);

				const stoTmp = new FileSystemStorageEngine(await mkdirTmp());

				const filename = "test.rtd";
				const writable = TabularData.createWriteStream(stoTmp, filename, 3);

				const { warnings } = (
					await wizard.toTabularData(
						fileName,
						writable,
						{
							delimiter: ",",
							dataArea: { header: { type: "SingleHeaderRow", headerRow: 0 }, body: 1 },
							columnMetadata: {
								x: {
									columnId: "x",
									title: "x",
									type: "number",
									normalizerIds: [],
								},
								y1: {
									columnId: "y1",
									title: "y1",
									type: "number",
									normalizerIds: [],
								},
								y2: {
									columnId: "y2",
									title: "y2",
									type: "number",
									normalizerIds: [],
									independent: ["x"],
								},
							},
							decimalSeparator: ".",
							manualDateConfig: {
								begin: createIDatetime(new Date(0)),
								end: createIDatetime(new Date(1)),
							},
						},
						deviceReferenceCheck
					)
				)._unsafeUnwrap();

				const td = await TabularData.open(stoTmp, filename, 3);
				return [td, warnings];
			};

			test("ignores complete line if the line unparsable", async () => {
				const [td, warnings] = await testFile("ErroneousLine.csv");

				expect(td.numRows()).toBe(4);
				expect(warnings).toHaveLength(1);
				expect(warnings[0]).toMatch(/columns/i);
			});

			test("ignores complete line if a single column is unparsable", async () => {
				const [td, warnings] = await testFile("NonParsableColumns.csv");

				expect(td.numRows()).toBe(3);
				expect(warnings).toHaveLength(2);
				expect(warnings[0]).toMatch(/Expected column x to be of type number/i);
				expect(warnings[1]).toMatch(/Ignoring line 3/i);
			});
		});

		describe("errors", () => {
			test("independent date column not in ascending/descending order", async () => {
				const wizard = new CSVImportWizard(sto);

				const stoTmp = new FileSystemStorageEngine(await mkdirTmp());
				const filename = "test.rtd";
				const writable = TabularData.createWriteStream(stoTmp, filename, 2);

				const result = await wizard.toTabularData(
					"XNotAscending.csv",
					writable,
					{
						delimiter: ",",
						dataArea: { header: { type: "SingleHeaderRow", headerRow: 0 }, body: 1 },
						columnMetadata: {
							x: {
								columnId: "x",
								title: "x",
								type: "offset",
								normalizerIds: [],
								startDate: 0,
								conversionFactor: 1,
								timezone: "Europe/Berlin",
							},
							y: {
								columnId: "y",
								title: "y",
								type: "number",
								normalizerIds: [],
								independent: ["x"],
							},
						},
						decimalSeparator: ".",
					},
					deviceReferenceCheck
				);

				expect(result.isErr()).toBeTruthy();
				expect(result._unsafeUnwrapErr().error).toMatch(/order or contain/);
			});

			test("independent variable descending", async () => {
				const wizard = new CSVImportWizard(sto);

				const stoTmp = new FileSystemStorageEngine(await mkdirTmp());
				const td = await TabularData.open(stoTmp, "test.rtd", 2);

				const result = (
					await wizard.toTabularData(
						"XDescending.csv",
						td.createWriteStream(),
						{
							delimiter: ",",
							dataArea: { header: { type: "SingleHeaderRow", headerRow: 0 }, body: 1 },
							columnMetadata: {
								x: {
									columnId: "x",
									title: "x",
									type: "offset",
									normalizerIds: [],
									startDate: 0,
									conversionFactor: 1,
									timezone: "Europe/Berlin",
								},
								y: {
									columnId: "y",
									title: "y",
									type: "number",
									normalizerIds: [],
									independent: ["x"],
								},
							},
							decimalSeparator: ".",
						},
						deviceReferenceCheck
					)
				)._unsafeUnwrap();

				expect(result.props.begin.getTime()).toBe(2);
				expect(result.props.end.getTime()).toBe(60);
			});

			test("import without sufficient time information", async () => {
				const wizard = new CSVImportWizard(sto);

				const stoTmp = new FileSystemStorageEngine(await mkdirTmp());
				const filename = "test.rtd";
				const writable = TabularData.createWriteStream(stoTmp, filename, 2);

				const result = await wizard.toTabularData(
					"Test.csv",
					writable,
					{
						delimiter: "|",
						dataArea: { header: { type: "SingleHeaderRow", headerRow: 0 }, body: 1 },
						columnMetadata: {
							a: {
								columnId: "a",
								title: "a",
								type: "number",
								normalizerIds: [],
							},
							b: {
								columnId: "b",
								title: "b",
								type: "number",
								normalizerIds: [],
							},
						},
						decimalSeparator: ".",
					},
					deviceReferenceCheck
				);

				expect(result.isErr()).toBeTruthy();
				expect(result._unsafeUnwrapErr().error).toMatch(/entered regarding time/);
			});
		});

		describe("checks for device references", () => {
			const basePreset: IToTabularDataOptions = {
				delimiter: "|",
				dataArea: { header: { type: "SingleHeaderRow", headerRow: 0 }, body: 1 },
				columnMetadata: {
					a: {
						columnId: "a",
						title: "a",
						type: "offset",
						conversionFactor: 1000,
						timezone: "Europe/Berlin",
						startDate: 0,
						normalizerIds: [],
					},
					b: {
						columnId: "b",
						title: "b",
						type: "number",
						normalizerIds: [],
						independent: ["a"],
					},
				},
				decimalSeparator: ".",
			};

			const preparePreset = (merge: PartialDeep<IToTabularDataOptions>) =>
				deepMerge(basePreset as any, merge) as unknown as IToTabularDataOptions;

			test("accepts valid device + path", async () => {
				const { result } = await toTabularDataTestHelper(
					sto,
					"Test.csv",
					preparePreset({
						columnMetadata: {
							b: {
								devicePath: ["root", "EXISTING_PATH"],
								deviceId: "EXISTING_ID" as IDeviceId,
							},
						},
					}),
					2
				);

				expect(result.warnings).toHaveLength(0);
			});

			test("warns about changed position", async () => {
				const { result } = await toTabularDataTestHelper(
					sto,
					"Test.csv",
					preparePreset({
						columnMetadata: {
							b: {
								devicePath: ["root", "NON_EXISTING_PATH"],
								deviceId: "EXISTING_ID" as IDeviceId,
							},
						},
					}),
					2
				);

				expect(result.warnings).toHaveLength(1);
				expect(result.warnings[0]).toMatch(/different position/);
			});

			test("warns about changed device", async () => {
				const { result } = await toTabularDataTestHelper(
					sto,
					"Test.csv",
					preparePreset({
						columnMetadata: {
							b: {
								devicePath: ["root", "EXISTING_PATH"],
								// NOTE: While this ID is not used in the mock, it is still possible
								// that the device ID was part of the device tree earlier and is now
								// missing. The CSVImportWizard simply updates the device ID and
								// issues a warning. There is no need to verify that the old device
								// ID is actually valid.
								deviceId: "OLD_ID" as IDeviceId,
							},
						},
					}),
					2
				);

				expect(result.warnings).toHaveLength(1);
				expect(result.warnings[0]).toMatch(/Device for column b is different/);
			});
		});

		describe("ignores trailing empty headers/columns", () => {
			test.each([
				"Header", // empty header column (data without empty column)
				"Data", // empty data column (header without empty column)
				"Column", // empty column in header and datas
			])("Supports trailing %s", async (e) => {
				const wizard = new CSVImportWizard(sto);

				const stoTmp = new FileSystemStorageEngine(await mkdirTmp());

				const filename = "test.rtd";
				const writable = TabularData.createWriteStream(stoTmp, filename, 2);

				const result = await wizard.toTabularData(
					`Trailing${e}.csv`,
					writable,
					{
						delimiter: ",",
						dataArea: { header: { type: "SingleHeaderRow", headerRow: 0 }, body: 1 },
						columnMetadata: {
							a: {
								columnId: "a",
								title: "a",
								type: "number",
								normalizerIds: [],
							},
							c: {
								columnId: "c",
								title: "c",
								type: "number",
								normalizerIds: [],
								independent: ["a"],
							},
						},
						decimalSeparator: ".",
						manualDateConfig: {
							begin: createIDatetime(new Date(0)),
							end: createIDatetime(new Date(1)),
						},
					},
					deviceReferenceCheck
				);

				const { props } = result._unsafeUnwrap();

				const td = await TabularData.open(stoTmp, filename, 2);

				expect(td.numRows()).toBe(2);
				expect(await td.row(0)).toEqual([1, 3]);
				expect(props.metadata.map((m) => m.title)).toEqual(["a", "c"]);
			});
		});
	});
});
