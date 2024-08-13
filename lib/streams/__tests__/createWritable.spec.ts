import { createWriteStream } from "fs";
import { join } from "path";

import { Minipass } from "minipass";
import { describe, expect, test } from "vitest";

import { createWritable } from "../createWritable";

import { mkdirTmp } from "~/lib/fs";
describe("createWritable", () => {
	test("wraps node writable stream in Minipass instance", async () => {
		const tmpDir = await mkdirTmp();
		const stream = createWriteStream(join(tmpDir, "does-not-exist"));
		const writable = createWritable(stream);

		expect(writable).toBeInstanceOf(Minipass);
	});
});
