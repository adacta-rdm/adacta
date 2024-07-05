import { mkdirTmp } from "@omegadot/fs";
import { FileSystemStorageEngine } from "@omegadot/storage-engine";
import { describe, test, expect, beforeEach } from "vitest";

import type { IKeyValueDocument, KeyValueDatabase } from "../KeyValueDatabase";
import { KeyValueDatabaseStorageEngineBackend } from "../KeyValueDatabaseStorageEngineBackend";

describe("KeyValueDatabaseStorageEngine", () => {
	let kvDatabase: KeyValueDatabase;

	beforeEach(async () => {
		kvDatabase = new KeyValueDatabaseStorageEngineBackend(
			new FileSystemStorageEngine(await mkdirTmp())
		);
	});

	test("supports basic interactions", async () => {
		const newKey = "new-key";
		const newValue: IKeyValueDocument = { type: "string", data: "test-value" };
		expect(await kvDatabase.has(newKey)).toBeFalsy();

		await kvDatabase.set(newKey, newValue);
		expect(await kvDatabase.has(newKey)).toBeTruthy();

		expect(await kvDatabase.get(newKey)).toStrictEqual(newValue);

		expect(await kvDatabase.get(newKey, "IDownsampledData")).toBeUndefined();
	});

	test("supports updates", async () => {
		const newKey = "new-key";
		const newValue: IKeyValueDocument = { type: "string", data: "test-value" };
		const newValue2: IKeyValueDocument = { type: "string", data: "test-value2" };
		await kvDatabase.set(newKey, newValue);
		expect(await kvDatabase.get(newKey)).toStrictEqual(newValue);
		await kvDatabase.set(newKey, newValue2);
		expect(await kvDatabase.get(newKey)).toStrictEqual(newValue2);
	});
});
