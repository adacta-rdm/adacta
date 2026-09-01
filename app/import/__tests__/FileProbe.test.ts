import { describe, expect, test } from "bun:test";

import { createFileProbe } from "~/app/import/FileProbe";
import { readTextPreview } from "~/app/import/textPreview";

describe("FileProbe", () => {
	test("reads only the requested byte range", async () => {
		const source = createFileProbe(new File(["0123456789"], "values.txt"));

		expect(new TextDecoder().decode(await source.read(2, 4))).toBe("2345");
	});

	test("creates a bounded normalized text preview", async () => {
		const source = createFileProbe(new File(["one\r\ntwo\r\nthree"], "values.txt"));

		expect(await readTextPreview(source, { maxLines: 2 })).toEqual({
			text: "one\ntwo",
			truncated: true,
			bytesRead: 15,
			linesShown: 2,
		});
	});

	test("limits the number of bytes read", async () => {
		const source = createFileProbe(new File(["abcdefghij"], "values.txt"));

		expect(await readTextPreview(source, { maxBytes: 4 })).toEqual({
			text: "abcd",
			truncated: true,
			bytesRead: 4,
			linesShown: 1,
		});
	});
});
