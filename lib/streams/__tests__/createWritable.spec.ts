import { createWriteStream } from "fs";
import { join } from "path";

import { describe, expect, test } from "vitest";

import { mkdirTmp } from "~/lib/fs";
import { createWritable } from "~/lib/streams";

describe("createWritable", () => {
	test("wraps node writable stream in Minipass instance", async () => {
		const tmpDir = await mkdirTmp();
		const stream = createWriteStream(join(tmpDir, "does-not-exist"));
		const writable = createWritable(stream);

		// Using "require" here to ensure the correct Minipass instance is used (the one that is loaded
		// by minipass-pipeline/index.js using the "require" function)
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const { Minipass } = require("minipass");
		expect(writable).toBeInstanceOf(Minipass);
	});
});
