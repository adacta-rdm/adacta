import { Buffer } from "buffer";

import { beforeAll, describe, expect, test, vi } from "vitest";

import { streamToString } from "./streamToString";
import { FileNotFoundError } from "../FileNotFoundError";
import type { IReadOptions, StorageEngine } from "../StorageEngine";
export function storageEngineTestSuite(
	implName: string,
	getStorageEngineInstance: () => StorageEngine | Promise<StorageEngine>
) {
	let sto: StorageEngine;
	const files = {
		"abc.txt": "abcdefghijklmnopqrstuvwxyz",
	};

	beforeAll(async () => {
		sto = await getStorageEngineInstance();
		for (const [path, fileContents] of Object.entries(files)) {
			await sto.write(path, Buffer.from(fileContents));
		}
	});

	describe(`StorageEngine test suite - ${implName} implementation`, () => {
		async function read(path: string, options?: IReadOptions): Promise<string> {
			const { buffer, bytesRead } = await sto.read(path, options);
			return buffer.toString("utf8", 0, bytesRead);
		}

		describe("read()", () => {
			test("returns complete file contents with default options", async () => {
				const string = await read("abc.txt");

				expect(string).toBe("abcdefghijklmnopqrstuvwxyz");
			});

			test("returns file contents with specified `length`", async () => {
				const string = await read("abc.txt", { length: 10 });

				expect(string).toBe("abcdefghij");
				expect(string).toHaveLength(10);
			});

			test("returns file contents from specified `position`", async () => {
				const string = await read("abc.txt", { position: 1, length: 10 });

				expect(string).toBe("bcdefghijk");
				expect(string).toHaveLength(10);
			});

			test("short buffer", async () => {
				const buffer16 = Buffer.alloc(16);
				const { buffer, bytesRead } = await sto.read("abc.txt", {
					buffer: buffer16,
				});

				expect(bytesRead).toBe(16);
				expect(buffer).toBe(buffer16);
				expect(buffer.toString("utf8")).toBe("abcdefghijklmnop");
			});

			test("throws FileNotFoundError when file does not exist", async () => {
				await expect(sto.read("THIS_FILE_SHOULD_NOT_EXIST")).rejects.toBeInstanceOf(
					FileNotFoundError
				);
			});
		});

		describe("rename()", () => {
			test("renames file", async () => {
				const src = "move-source";
				const dst = "move-dst";

				await sto.write(src, Buffer.from("123"));

				await expect(sto.size(dst)).rejects.toThrow();

				await sto.rename(src, dst);

				await expect(sto.size(src)).rejects.toThrow();
				expect(await sto.size(dst)).toBe(3);

				await sto.remove(dst);
			});

			test("throws FileNotFoundError when file does not exist", async () => {
				await expect(sto.rename("THIS_FILE_SHOULD_NOT_EXIST", "new-name")).rejects.toBeInstanceOf(
					FileNotFoundError
				);
			});
		});

		describe("remove()", () => {
			test("cannot access removed file", async () => {
				const src = "deletion-test";
				await sto.write(src, Buffer.from("123"));

				expect(await sto.size(src)).toBe(3);
				await sto.remove(src);
				await expect(sto.size(src)).rejects.toThrow();
			});
		});

		describe("size()", () => {
			test("returns size of file in bytes", async () => {
				expect(await sto.size("abc.txt")).toBe(26);
			});

			test("throws FileNotFoundError when file does not exist", async () => {
				await expect(sto.size("THIS_FILE_SHOULD_NOT_EXIST")).rejects.toBeInstanceOf(
					FileNotFoundError
				);
			});
		});

		describe("exists()", () => {
			test("returns true for existing file", async () => {
				expect(await sto.exists("abc.txt")).toBe(true);
			});

			test("returns false for non existing file", async () => {
				expect(await sto.exists("THIS_FILE_SHOULD_NOT_EXIST")).toBe(false);
			});
		});

		describe("createReadStream()", () => {
			test("streams file contents", async () => {
				const stream = sto.createReadStream("abc.txt");

				expect(await streamToString(stream)).toBe(files["abc.txt"]);
			});

			test("emits FileNotFoundError when file does not exist", async () => {
				const stream = sto.createReadStream("THIS_FILE_SHOULD_NOT_EXIST");

				return expect(stream.promise()).rejects.toBeInstanceOf(FileNotFoundError);
			});
		});

		describe("createWriteStream()", () => {
			test("appends data to end of file", async () => {
				const stream = sto.createWriteStream("stream.txt");

				stream.write(Buffer.from("012345"));
				stream.write(Buffer.from("abcdef"));
				stream.end();

				await stream.promise();

				const fileContents = await read("stream.txt");

				expect(fileContents).toBe("012345abcdef");
			});

			test("emits 'finish' event to signal that all data has been flushed to the underlying system", async () => {
				const stream = sto.createWriteStream("stream.txt");

				const promise = new Promise<void>((resolve) => stream.on("finish", resolve));

				stream.write(Buffer.from("012345"));
				stream.write(Buffer.from("abcdef"));
				stream.end();

				await promise;
			});

			test("returns false on write and emits drain to resume stream", async () => {
				const writable = sto.createWriteStream("drain");

				const chunkSize = 16 * 1024; // 16kB
				const numberChunks = 10;
				const filesize = chunkSize * numberChunks;

				const fn = vi.fn();

				for (let i = 0; i < numberChunks; ++i) {
					if (!writable.write(Buffer.alloc(chunkSize, 0))) {
						fn();
						await new Promise<void>((resolve) => writable.once("drain", resolve));
					}
				}
				writable.end();

				// Assert that writable.write returned false at least once
				expect(fn).toHaveBeenCalled();

				await writable.promise();

				// Had the stream not emitted the "drain" event, we wouldn't have reached this part of the code
				// Nevertheless check that filesize is correct
				expect(await sto.size("drain")).toBe(filesize);
			});
		});
	});
}
