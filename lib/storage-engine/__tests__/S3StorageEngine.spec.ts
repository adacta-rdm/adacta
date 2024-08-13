import { describe } from "vitest";

import { storageEngineTestSuite } from "./storageEngineTestSuite";
import { S3StorageEngine } from "../S3StorageEngine";

import { readEnvVar } from "~/lib/utils/readEnvVar";

describe("S3StorageEngine", () => {
	storageEngineTestSuite(
		"S3StorageEngine",
		() =>
			new S3StorageEngine({
				endpoint: readEnvVar("S3_ENDPOINT"),
				region: readEnvVar("S3_REGION"),
				accessKeyId: readEnvVar("S3_ACCESS_KEY"),
				secretAccessKey: readEnvVar("S3_SECRET_ACCESS_KEY"),
				bucket: readEnvVar("S3_BUCKET"),
				prefix: `tests/storage-engine-s3-1/${Date.now()}`,
			})
	);
});
