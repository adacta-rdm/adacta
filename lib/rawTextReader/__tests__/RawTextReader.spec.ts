import { copyFile } from "fs/promises";
import { resolve } from "path";

import { mkdirTmp, readUTF8File, rmrf } from "@omegadot/fs";
import type { StorageEngine } from "@omegadot/storage-engine";
import { FileSystemStorageEngine } from "@omegadot/storage-engine";
import { describe, test, expect, beforeAll, afterAll } from "vitest";

import { RawTextReader } from "../RawTextReader";

describe("RawTextReader", () => {
	let testDir: string;
	let testFilePath: string;
	let sto: StorageEngine;

	beforeAll(async () => {
		testDir = await mkdirTmp();
		testFilePath = "test";
		sto = new FileSystemStorageEngine(testDir);
	});

	afterAll(async () => rmrf(testFilePath));

	test("text", async () => {
		const path = resolve(__dirname, "fixtures", "large.tsv");

		await copyFile(path, resolve(testDir, "large.tsv"));

		const fileContent = await readUTF8File(path);
		const reader = new RawTextReader("large.tsv", sto);
		const text = await reader.text(0, 100);
		expect(text).toEqual(fileContent.substr(0, 100));
	});

	/**
	 * UTF-8 encoded characters can take up between 1 and 4 bytes. Therefore, it might happen, that
	 * the file in sliced in the middle of a character which results in a different last character
	 * or an invalid last character (�). "𝄞" for example uses 4 bytes.
	 */
	test("Shows garbage as last character", async () => {
		await sto.write(testFilePath, new Buffer("𝄞𝄞"));
		const reader = new RawTextReader(testFilePath, sto);
		const text = await reader.text(0, 6);
		expect(text).toBe("𝄞�");
	});
});
