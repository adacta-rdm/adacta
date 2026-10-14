/**
 * Tests what only the file system engine does. The behavior every storage
 * engine shares is tested in runtimes/__tests__/StorageEngine.test.ts.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { InvalidStoragePathError } from "~/lib/storage-engine/InvalidStoragePathError.ts";
import { FileSystemStorageEngine } from "~/runtimes/bun/lib/FileSystemStorageEngine.ts";

describe("FileSystemStorageEngine", () => {
	let directory: string;

	beforeEach(async () => {
		directory = await mkdtemp(join(tmpdir(), "adacta-storage-"));
	});

	afterEach(async () => {
		await rm(directory, { recursive: true, force: true });
	});

	test("rejects paths outside the storage directory", async () => {
		const storage = new FileSystemStorageEngine(directory);

		for (const path of ["", ".", "../outside.txt", "/absolute.txt"]) {
			await expect(storage.write(path, new Blob(["contents"]).stream())).rejects.toBeInstanceOf(
				InvalidStoragePathError,
			);
		}
	});
});
