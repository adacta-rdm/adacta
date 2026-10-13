import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { Env } from "~/lib/env/Env.ts";
import { deleteLocalData } from "~/runtimes/bun/cli/helpers/deleteLocalData.ts";
import { sqliteDatabasePath } from "~/runtimes/bun/sqliteDatabase.ts";
import { createTestAppContainer, migrateTestDatabase } from "~/runtimes/bun/testEnvironment.ts";

describe("deleteLocalData", () => {
	test("deletes the database and the stored files", async () => {
		const container = createTestAppContainer();
		await migrateTestDatabase(container);
		const env = container.get(Env);
		const file = join(env.string("ADACTA_STORAGE_DIR"), "original-files", "1234567890123");
		mkdirSync(join(file, ".."), { recursive: true });
		writeFileSync(file, "left over");

		deleteLocalData(env);

		expect(existsSync(sqliteDatabasePath(env))).toBeFalse();
		expect(existsSync(file)).toBeFalse();
	});
});
