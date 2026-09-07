import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { createAppContainer } from "~/app/.server/createAppContainer.ts";
import { RepoAccess } from "~/app/services/RepoAccess.ts";
import { Env } from "~/lib/env/Env.ts";
import { FileSystemStorageEngine } from "~/lib/storage-engine/FileSystemStorageEngine.ts";
import { StorageEngine } from "~/lib/storage-engine/StorageEngine.ts";

const directories: string[] = [];

afterEach(async () => {
	for (const directory of directories.splice(0)) {
		await rm(directory, { recursive: true, force: true });
	}
});

describe("createAppContainer", () => {
	test("configures filesystem storage from ADACTA_STORAGE_DIR", async () => {
		const directory = await mkdtemp(join(tmpdir(), "adacta-storage-config-"));
		directories.push(directory);
		const app = createAppContainer(new Env({ ADACTA_STORAGE_DIR: directory }));

		const demo = storageFor(app.clone(), "demo");
		const pilot = storageFor(app.clone(), "pilot");

		expect(demo).toBeInstanceOf(FileSystemStorageEngine);
		expect((demo as FileSystemStorageEngine).directory).toBe(resolve(directory, "demo"));
		expect((pilot as FileSystemStorageEngine).directory).toBe(resolve(directory, "pilot"));
		expect(demo).not.toBe(pilot);
	});
});

function storageFor(container: ReturnType<typeof createAppContainer>, repository: string) {
	container.configure(RepoAccess, () => ({ repository }) as RepoAccess);
	return container.get(StorageEngine);
}
