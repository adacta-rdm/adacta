import { describe, expect, test } from "vitest";

import { storageEngineTestSuite } from "./storageEngineTestSuite";

import { mkdirTmp } from "~/lib/fs";
import { FileSystemStorageEngine } from "~/lib/storage-engine";

describe("FileSystemStorageEngine", () => {
	storageEngineTestSuite(
		"FileSystemStorageEngine",
		async () => new FileSystemStorageEngine(await mkdirTmp())
	);

	test("#createReadStream() - highWaterMark option controls chunk size", async () => {
		const sto = new FileSystemStorageEngine(await mkdirTmp());
		await sto.write("abc.txt", Buffer.from("abcdefghijklmnopqrstuvwxyz"));
		const stream = sto.createReadStream("abc.txt", { highWaterMark: 8 });

		const lengths = [];
		for await (const chunk of stream) {
			lengths.push(chunk.byteLength);
		}

		expect(lengths).toEqual([8, 8, 8, 2]);
	});
});
