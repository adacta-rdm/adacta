import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { FileAlreadyExistsError } from "~/lib/storage-engine/FileAlreadyExistsError.ts";
import { FileNotFoundError } from "~/lib/storage-engine/FileNotFoundError.ts";
import { FileSystemStorageEngine } from "~/lib/storage-engine/FileSystemStorageEngine.ts";
import { InvalidStoragePathError } from "~/lib/storage-engine/InvalidStoragePathError.ts";
import type { StorageEngine } from "~/lib/storage-engine/StorageEngine.ts";

describe("FileSystemStorageEngine", () => {
	let directory: string;
	let storage: StorageEngine;

	beforeEach(async () => {
		directory = await mkdtemp(join(tmpdir(), "adacta-storage-"));
		storage = new FileSystemStorageEngine(directory);
	});

	afterEach(async () => {
		await rm(directory, { recursive: true, force: true });
	});

	test("writes and reads a stream", async () => {
		await storage.write("measurements/run.csv", textStream("time,value\n", "0,12\n"));

		expect(await readText(storage, "measurements/run.csv")).toBe("time,value\n0,12\n");
	});

	test("replaces and truncates an existing file", async () => {
		await storage.write("source.txt", textStream("a longer value"));
		await storage.write("source.txt", textStream("short"));

		expect(await readText(storage, "source.txt")).toBe("short");
	});

	test("rejects when the source stream fails", async () => {
		const source = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.error(new Error("Source failed"));
			},
		});

		expect(storage.write("source.txt", source)).rejects.toThrow("Source failed");
	});

	describe("range reads", () => {
		beforeEach(async () => {
			await storage.write("values.txt", textStream("0123456789"));
		});

		test("reads from start for a given length", async () => {
			expect(await readText(storage, "values.txt", { start: 2, length: 4 })).toBe("2345");
		});

		test("reads the remainder when length is omitted", async () => {
			expect(await readText(storage, "values.txt", { start: 7 })).toBe("789");
		});

		test("returns an empty stream for a zero length", async () => {
			expect(await readText(storage, "values.txt", { start: 2, length: 0 })).toBe("");
		});

		test("returns available bytes when the range reaches beyond the file", async () => {
			expect(await readText(storage, "values.txt", { start: 8, length: 20 })).toBe("89");
			expect(await readText(storage, "values.txt", { start: 20, length: 4 })).toBe("");
		});

		test("rejects invalid ranges", async () => {
			expect(storage.read("values.txt", { start: -1 })).rejects.toBeInstanceOf(RangeError);
			expect(storage.read("values.txt", { length: 1.5 })).rejects.toBeInstanceOf(RangeError);
		});
	});

	test("reports a missing file before returning a read stream", async () => {
		expect(storage.read("missing.txt")).rejects.toBeInstanceOf(FileNotFoundError);
	});

	test("reports size and existence", async () => {
		expect(await storage.exists("source.txt")).toBe(false);

		await storage.write("source.txt", textStream("12345"));

		expect(await storage.exists("source.txt")).toBe(true);
		expect(await storage.size("source.txt")).toBe(5);
	});

	test("renames a file and creates the destination directory", async () => {
		await storage.write("source.txt", textStream("contents"));
		await storage.rename("source.txt", "archive/source.txt");

		expect(await storage.exists("source.txt")).toBe(false);
		expect(await readText(storage, "archive/source.txt")).toBe("contents");
	});

	test("rejects a rename when the destination exists", async () => {
		await storage.write("source.txt", textStream("source contents"));
		await storage.write("destination.txt", textStream("destination contents"));

		expect(storage.rename("source.txt", "destination.txt")).rejects.toBeInstanceOf(
			FileAlreadyExistsError,
		);
		expect(await readText(storage, "source.txt")).toBe("source contents");
		expect(await readText(storage, "destination.txt")).toBe("destination contents");
	});

	test("removes a file", async () => {
		await storage.write("source.txt", textStream("contents"));
		await storage.remove("source.txt");

		expect(await storage.exists("source.txt")).toBe(false);
	});

	test("removing a file twice is not an error", async () => {
		await storage.write("source.txt", textStream("contents"));
		await storage.remove("source.txt");
		await storage.remove("source.txt");

		expect(await storage.exists("source.txt")).toBe(false);
	});

	test("uses one missing-file error for read, size, and rename", async () => {
		expect(storage.read("missing.txt")).rejects.toBeInstanceOf(FileNotFoundError);
		expect(storage.size("missing.txt")).rejects.toBeInstanceOf(FileNotFoundError);
		expect(storage.rename("missing.txt", "new.txt")).rejects.toBeInstanceOf(FileNotFoundError);
	});

	test("rejects paths outside the storage directory", async () => {
		for (const path of ["", ".", "../outside.txt", "/absolute.txt"]) {
			expect(storage.write(path, textStream("contents"))).rejects.toBeInstanceOf(
				InvalidStoragePathError,
			);
		}
	});
});

function textStream(...chunks: string[]): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();
	return new ReadableStream({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
			controller.close();
		},
	});
}

async function readText(
	storage: StorageEngine,
	path: string,
	options?: { start?: number; length?: number },
): Promise<string> {
	return new Response(await storage.read(path, options)).text();
}
