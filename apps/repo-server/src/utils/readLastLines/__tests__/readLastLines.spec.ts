import { resolve } from "path";

import { describe, test, expect } from "vitest";

import { readLastLines } from "../readLastLines";

import { FileSystemStorageEngine } from "~/lib/storage-engine";

describe("readLastLines", function () {
	const path = resolve("apps/repo-server/src/utils/readLastLines/__tests__/cases");
	const sto = new FileSystemStorageEngine(path);

	test("return last line when asked for 1 (default)", async () => {
		const lines = await readLastLines(sto, "123.txt");
		expect(lines).toHaveLength(1);
		expect(lines).toEqual(["9"]);
	});

	test("return last 2 lines when asked for 2", async () => {
		const lines = await readLastLines(sto, "123.txt", { nLines: 2 });
		expect(lines).toHaveLength(2);
		expect(lines).toEqual(["8", "9"]);
	});

	test("return all lines when asked for more than the file has", async function () {
		const lines = await readLastLines(sto, "123.txt", { nLines: 15 });
		expect(lines).toHaveLength(9);
	});

	test("removes empty trailing line per default", async () => {
		const lines1 = await readLastLines(sto, "123.txt");
		const lines2 = await readLastLines(sto, "123+eol.txt");
		expect(lines1).toEqual(lines2);
	});

	test("windows style line endings", async () => {
		const lines = await readLastLines(sto, "windows_new_lines", { nLines: 3 });
		expect(lines).toEqual(["8", "9", "10"]);
	});

	test("reads UTF-8 files with small chunk size", async () => {
		const [line] = await readLastLines(sto, "utf8", { chunkSize: 5 });

		expect(line).toContain("español");
		expect(line).toContain("português");
		expect(line).toContain("日本語");
		expect(line).toContain("中文");
	});

	test("requested lines do not fit into single chunk", async () => {
		const lines = await readLastLines(sto, "123+eol.txt", { nLines: 100, chunkSize: 3 });

		expect(lines).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
	});
});
