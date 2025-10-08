import { beforeEach, describe, expect, test } from "vitest";

import { omegadotStreamToWeb } from "./omegadotStreamToWeb";

import { CSVOutput } from "~/apps/repo-server/src/csvExport/CSVOutput";
import { mkdirTmp } from "~/lib/fs";
import type { StorageEngine } from "~/lib/storage-engine";
import { FileSystemStorageEngine } from "~/lib/storage-engine";
import { TabularData } from "~/lib/tabular-data";

describe("CSVExport", () => {
	let stream: ReadableStream<number[]>;

	beforeEach(async () => {
		const sto: StorageEngine = new FileSystemStorageEngine(await mkdirTmp());
		const tdStream = TabularData.createWriteStream(sto, "test");

		tdStream.write([1, 2, 3]);
		tdStream.write([4, 5, 6]);
		tdStream.write([7, 8, 9]);
		tdStream.end();

		const td = await TabularData.open(sto, "test", 3);

		const tdStreamRead = td.createReadStream();
		stream = omegadotStreamToWeb(tdStreamRead);
	});

	test("Creates a basic CSV with header", async () => {
		const csvStream = CSVOutput.withHeader(stream, ["a", "b", "c"], { delimiter: "," });

		let string = "";
		for await (const chunk of csvStream) {
			string += Buffer.from(chunk).toString("utf-8");
		}

		expect(string).toEqual("a,b,c\n1,2,3\n4,5,6\n7,8,9\n");
	});

	describe("Transform stream", () => {
		const createTest = async (lines: (string | number)[][]) => {
			// Create temporary header
			const header = new Array(lines[0].length).fill("").map((_, index) => `Column${index}`);
			const sourceStream = new ReadableStream({
				start(controller) {
					for (const line of lines) {
						// Push each line as chunk into the stream
						controller.enqueue(line);
					}
					controller.close();
				},
			});

			const transformStream = CSVOutput.withHeader(sourceStream, header, { lineTerminator: "\n" });

			let string = "";
			for await (const chunk of transformStream) {
				string += Buffer.from(chunk).toString("utf-8");
			}

			// Strip header line
			return string.split("\n").slice(1).join("\n");
		};

		test("Emits basic CSV", async () => {
			expect(
				await createTest([
					[1, 2, 3],
					[4, 5, 6],
					[7, 8, 9],
				])
			).toEqual("1,2,3\n4,5,6\n7,8,9\n");
		});

		test("Escapes characters if necessary", async () => {
			expect(
				await createTest([
					[1, 2, "foo"], // No escape
					[4, 5, "foo,bar"], // Escape delimiter char
					[7, 8, 'foo"bar'], // Escape quote char
				])
			).toEqual('1,2,foo\n4,5,"foo,bar"\n7,8,"foo""bar"\n');
		});
	});
});
