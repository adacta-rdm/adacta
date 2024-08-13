import { createWriteStream } from "fs";
import { join } from "path";

import { Minipass } from "minipass";
import { describe, expect, test } from "vitest";

import { mkdirTmp } from "~/lib/fs";
import { createWritable } from "~/lib/streams";

describe("createWritable", () => {
	test("wraps node writable stream in Minipass instance", async () => {
		const tmpDir = await mkdirTmp();
		const stream = createWriteStream(join(tmpDir, "does-not-exist"));
		const writable = createWritable(stream);

		expect(writable).toBeInstanceOf(Minipass);
	});
});
