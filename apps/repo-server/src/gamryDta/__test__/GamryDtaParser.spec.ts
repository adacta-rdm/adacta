import { describe, expect, test } from "vitest";

import type {
	GamryDtaParserEvents,
	TGamryMetadata,
} from "~/apps/repo-server/src/gamryDta/GamryFileReader";
import {
	GamryFileReader,
	OverflowParser,
	OverflowTypes,
} from "~/apps/repo-server/src/gamryDta/GamryFileReader";
import { FileSystemStorageEngine } from "~/lib/storage-engine";
import type { Readable } from "~/lib/streams";

describe("GamryDtaParser", () => {
	test.each([
		{ filename: "ocp_data.dta", lengths: [11] },
		{ filename: "eispot_data.dta", lengths: [3] },
		{ filename: "cv_data.dta", lengths: [3, 3, 3, 3] },
	])("$filename", async (testObj) => {
		const { filename, lengths } = testObj;

		const sto = new FileSystemStorageEngine(`${__dirname}/data`);
		const gamryParser = new GamryFileReader(sto, filename);

		const datastream = await gamryParser.parse();
		const result = await consumeParserStreamToObject(datastream);

		expect(result.tables).toHaveLength(lengths.length);
		expect(result.tables.map((t) => t.length)).toStrictEqual(lengths);
		expect(result.expectedSizes).toMatchSnapshot(); // Some tables have expected sizes, some don't
	});

	describe("Partial file", () => {
		test("cv_data_partial.dta", async () => {
			const sto = new FileSystemStorageEngine(`${__dirname}/data`);
			const gamryParser = new GamryFileReader(sto, "cv_data_partial.dta");

			const datastream = await gamryParser.parse();
			await expect(datastream.promise()).rejects.toThrow();
		});
	});

	describe("OverflowParser", () => {
		test("isOverflowFlagSet", () => {
			expect(OverflowParser.isOverflowFlagSet("..........a", OverflowTypes.ADC_AUX)).toBe(true);
			expect(OverflowParser.isOverflowFlagSet("..........a", OverflowTypes.ADC_RANGE_I)).toBe(
				false
			);

			expect(OverflowParser.isOverflowFlagSet("......s...a", OverflowTypes.ADC_AUX)).toBe(true);
			expect(
				OverflowParser.isOverflowFlagSet("......s...a", OverflowTypes.SETTELING_PROBLEM_HARDWARE)
			).toBe(true);
		});
	});
});

function consumeParserStreamToObject(datastream: Readable<GamryDtaParserEvents>) {
	let tableCounter = -1;

	const tables: (string | number)[][][] = []; // dimension 1: table, dimension 2: row, dimension 3: column
	const minMax: { min: (number | undefined)[]; max: (number | undefined)[] }[] = [];

	let metadata!: TGamryMetadata;
	let auxData!: string[];
	let displayNames!: Map<string, string>;

	const expectedSizes: (number | undefined)[] = [];

	return new Promise<{
		metadata: TGamryMetadata | undefined;
		auxData: string[];
		displayNames: Map<string, string>;
		tables: typeof tables;
		expectedSizes: typeof expectedSizes;
		minMax: typeof minMax;
	}>((resolve) => {
		datastream.on("data", (data) => {
			if (data.type === "metadata") {
				metadata = data.data.metadata;
				auxData = data.data.auxData;
				displayNames = data.data.displayNames;
			}

			if (data.type === "next") {
				tableCounter++;
				expectedSizes[tableCounter] = data.expectedCurveLength;
			}

			if (data.type === "data") {
				tables[tableCounter] = tables.at(tableCounter) ?? [];
				tables[tableCounter].push(data.data);
			}

			if (data.type === "minmax") {
				minMax[tableCounter] = { min: data.min, max: data.max };
			}
		});

		datastream.on("end", () => {
			resolve({ metadata, auxData, displayNames, tables, expectedSizes, minMax });
		});
	});
}
