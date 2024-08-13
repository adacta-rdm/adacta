import { describe, test, expect } from "vitest";

import { downsample } from "../downsample";

import { mkdirTmp } from "~/lib/fs";
import { SilentLogger } from "~/lib/logger/SilentLogger";
import { FileSystemStorageEngine } from "~/lib/storage-engine";
import type { Writable } from "~/lib/streams";
import { TabularData } from "~/lib/tabular-data";

function fillTable(stream: Writable<number[]>) {
	stream.write([0, 2, 9]);
	stream.write([1, 4, 1]);
	stream.write([2, 6, 1]);
	stream.write([3, 8, 1]);
	stream.write([4, 2, 9]);
	stream.write([5, 4, 5]);
	stream.write([6, 6, 9]);
	stream.write([7, 8, 9]);
	stream.write([8, 2, 1]);
	stream.write([9, 4, 5]);
	stream.end();

	return stream.promise();
}

describe("downsample()", () => {
	test("downsample all columns in tabular data", async () => {
		const sto = new FileSystemStorageEngine(await mkdirTmp());

		await fillTable(TabularData.createWriteStream(sto, "temp"));

		const result = await downsample(
			{ sto, logger: new SilentLogger() },
			{
				input: {
					prefix: "",
					path: "temp",
					numberRows: 10,
					numberColumns: 3,
					columns: {
						x: 0,
						y: [1, 2],
					},
				},
				threshold: 5,
			}
		);

		// Returns an a
		expect(result).toHaveLength(2);
		// 5 points in y1
		expect(result[0]).toHaveLength(5);
		// 5 points in y2
		expect(result[1]).toHaveLength(5);

		expect(result).toMatchSnapshot();
	});
});
