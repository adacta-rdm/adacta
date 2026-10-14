/**
 * Tests the StorageEngine of the selected runtime against the contract in
 * lib/storage-engine/StorageEngine.ts. Every runtime must pass these tests
 * unchanged. Each test starts with empty storage.
 */
import { describe, expect, test } from "bun:test";

import { setupEmptyTestStorageEnvironment } from "~/app/testUtils/testUtils.ts";
import { FileAlreadyExistsError } from "~/lib/storage-engine/FileAlreadyExistsError.ts";
import { FileNotFoundError } from "~/lib/storage-engine/FileNotFoundError.ts";
import { StorageEngine } from "~/lib/storage-engine/StorageEngine.ts";

async function emptyStorage(): Promise<StorageEngine> {
	return (await setupEmptyTestStorageEnvironment()).get(StorageEngine);
}

describe("StorageEngine", () => {
	describe("write", () => {
		test("stores a stream whose length is not known in advance", async () => {
			const storage = await emptyStorage();

			await storage.write("measurements/run.csv", textStream("time,value\n", "0,12\n"));

			expect(await readText(storage, "measurements/run.csv")).toBe("time,value\n0,12\n");
		});

		test("stores an empty file", async () => {
			const storage = await emptyStorage();

			await storage.write("empty.txt", textStream());

			expect(await readText(storage, "empty.txt")).toBe("");
			expect(await storage.size("empty.txt")).toBe(0);
			expect(await storage.exists("empty.txt")).toBe(true);
		});

		test("replaces an existing file with shorter contents", async () => {
			const storage = await emptyStorage();
			await storage.write("source.txt", textStream("a longer value"));

			await storage.write("source.txt", textStream("short"));

			expect(await readText(storage, "source.txt")).toBe("short");
		});

		test("rejects when the source stream fails", async () => {
			const storage = await emptyStorage();
			const source = new ReadableStream<Uint8Array>({
				start(controller) {
					controller.error(new Error("Source failed"));
				},
			});

			const result = storage.write("source.txt", source);

			await expect(result).rejects.toThrow("Source failed");
		});
	});

	describe("read", () => {
		test.each([
			[{ start: 2, length: 4 }, "2345"],
			[{ start: 7 }, "789"],
			[{ start: 8, length: 20 }, "89"],
			[{ start: 2, length: 0 }, ""],
			[{ start: 10 }, ""],
			[{ start: 20, length: 4 }, ""],
		])("reads the range %j of a file", async (options, expected) => {
			const storage = await emptyStorage();
			await storage.write("values.txt", textStream("0123456789"));

			const text = await readText(storage, "values.txt", options);

			expect(text).toBe(expected);
		});

		test("reads an empty file as an empty stream", async () => {
			const storage = await emptyStorage();
			await storage.write("empty.txt", textStream());

			const text = await readText(storage, "empty.txt", { start: 0, length: 4 });

			expect(text).toBe("");
		});

		test("rejects a missing file before returning a stream", async () => {
			const storage = await emptyStorage();

			await expect(storage.read("missing.txt")).rejects.toBeInstanceOf(FileNotFoundError);
			await expect(storage.read("missing.txt", { length: 0 })).rejects.toBeInstanceOf(
				FileNotFoundError,
			);
		});

		test("rejects an invalid range", async () => {
			const storage = await emptyStorage();
			await storage.write("values.txt", textStream("0123456789"));

			await expect(storage.read("values.txt", { start: -1 })).rejects.toBeInstanceOf(RangeError);
			await expect(storage.read("values.txt", { length: 1.5 })).rejects.toBeInstanceOf(RangeError);
		});
	});

	describe("rename", () => {
		test("moves a file to a new path", async () => {
			const storage = await emptyStorage();
			await storage.write("source.txt", textStream("contents"));

			await storage.rename("source.txt", "archive/source.txt");

			expect(await storage.exists("source.txt")).toBe(false);
			expect(await readText(storage, "archive/source.txt")).toBe("contents");
		});

		test("keeps both files when the destination exists", async () => {
			const storage = await emptyStorage();
			await storage.write("source.txt", textStream("source contents"));
			await storage.write("destination.txt", textStream("destination contents"));

			const result = storage.rename("source.txt", "destination.txt");

			await expect(result).rejects.toBeInstanceOf(FileAlreadyExistsError);
			expect(await readText(storage, "source.txt")).toBe("source contents");
			expect(await readText(storage, "destination.txt")).toBe("destination contents");
		});

		test("rejects a missing source", async () => {
			const storage = await emptyStorage();

			const result = storage.rename("missing.txt", "new.txt");

			await expect(result).rejects.toBeInstanceOf(FileNotFoundError);
		});
	});

	describe("size and exists", () => {
		test("report a stored file", async () => {
			const storage = await emptyStorage();
			await storage.write("source.txt", textStream("12345"));

			expect(await storage.exists("source.txt")).toBe(true);
			expect(await storage.size("source.txt")).toBe(5);
		});

		test("report a missing file", async () => {
			const storage = await emptyStorage();

			expect(await storage.exists("missing.txt")).toBe(false);
			await expect(storage.size("missing.txt")).rejects.toBeInstanceOf(FileNotFoundError);
		});
	});

	describe("remove", () => {
		test("deletes a file, and deleting it again has no effect", async () => {
			const storage = await emptyStorage();
			await storage.write("source.txt", textStream("contents"));

			await storage.remove("source.txt");
			await storage.remove("source.txt");

			expect(await storage.exists("source.txt")).toBe(false);
		});
	});
});

/**
 * Returns a stream of the given text chunks. Its length is not known in
 * advance, as with an uploaded form part.
 */
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
