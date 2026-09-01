import { describe, expect, test } from "bun:test";

import { appendUniqueFiles } from "~/app/import/sourceFiles";

describe("appendUniqueFiles", () => {
	test("adds files to the source bundle in selection order", () => {
		const first = new File(["first"], "first.txt", { lastModified: 1 });
		const second = new File(["second"], "second.txt", { lastModified: 2 });

		expect(appendUniqueFiles([first], [second])).toEqual([first, second]);
	});

	test("does not add the same browser file twice", () => {
		const first = new File(["first"], "values.txt", {
			type: "text/plain",
			lastModified: 1,
		});
		const duplicate = new File(["first"], "values.txt", {
			type: "text/plain",
			lastModified: 1,
		});

		expect(appendUniqueFiles([first], [duplicate])).toEqual([first]);
	});
});
