import { describe } from "vitest";

import { storageEngineTestSuite } from "./storageEngineTestSuite";
import { S3StorageEngine } from "../S3StorageEngine";

import { S3Config } from "~/apps/repo-server/src/config/S3Config";
import { readTestEnv } from "~/apps/repo-server/testUtils";

readTestEnv();

describe("S3StorageEngine", () => {
	storageEngineTestSuite(
		"S3StorageEngine",
		() => new S3StorageEngine(new S3Config({ prefix: `tests/storage-engine-s3-1/${Date.now()}` }))
	);
});
