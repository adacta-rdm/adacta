import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { createLocalAppContainer } from "~/app/.server/appContainer.local.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { setupTestPersistenceEnvironment } from "~/app/testUtils/testUtils.ts";
import { Env } from "~/lib/env/Env.ts";
import { FileSystemStorageEngine } from "~/lib/storage-engine/FileSystemStorageEngine.ts";
import { StorageEngine } from "~/lib/storage-engine/StorageEngine.ts";

const directories: string[] = [];

afterEach(async () => {
	for (const directory of directories.splice(0)) {
		await rm(directory, { recursive: true, force: true });
	}
});

describe("createLocalAppContainer", () => {
	test("shares one connection across requests", () => {
		const app = setupTestPersistenceEnvironment();
		const first = app.clone();
		const second = app.clone();

		const database = first.get(ApplicationDatabase);

		expect(second.get(ApplicationDatabase)).toBe(database);
		expect(app.get(ApplicationDatabase)).toBe(database);
	});

	test("configures filesystem storage from ADACTA_STORAGE_DIR", async () => {
		const directory = await mkdtemp(join(tmpdir(), "adacta-storage-config-"));
		directories.push(directory);
		const app = createLocalAppContainer(new Env({ ADACTA_STORAGE_DIR: directory }));

		const storage = app.clone().get(StorageEngine);
		const another = app.clone().get(StorageEngine);

		expect(storage).toBeInstanceOf(FileSystemStorageEngine);
		expect((storage as FileSystemStorageEngine).directory).toBe(resolve(directory));
		expect((another as FileSystemStorageEngine).directory).toBe(resolve(directory));
		expect(storage).not.toBe(another);
	});
});
