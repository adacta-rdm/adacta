import { describe, expect, test } from "bun:test";

import { parseCsvPreview } from "~/app/lib/textPreview.ts";

describe("CSV text previews", () => {
	test("guesses comma delimiters", () => {
		const preview = parseCsvPreview({
			text: "name,value\nalpha,1\nbeta,2",
			truncated: false,
			bytesRead: 25,
			linesShown: 3,
		});

		expect(preview.delimiter).toBe(",");
		expect(preview.rows).toEqual([
			["name", "value"],
			["alpha", "1"],
			["beta", "2"],
		]);
	});

	test("guesses semicolon delimiters and preserves quoted values", () => {
		const preview = parseCsvPreview({
			text: 'name;note\nalpha;"one;two"\nbeta;three',
			truncated: true,
			bytesRead: 42,
			linesShown: 3,
		});

		expect(preview.delimiter).toBe(";");
		expect(preview.rows[1]).toEqual(["alpha", "one;two"]);
		expect(preview.truncated).toBe(true);
	});

	test("ignores delimiters inside escaped quoted values", () => {
		const preview = parseCsvPreview({
			text: 'name;note\nalpha;"one;""two;three"""\nbeta;four',
			truncated: false,
			bytesRead: 45,
			linesShown: 3,
		});
		expect(preview.delimiter).toBe(";");
		expect(preview.rows[1]).toEqual(["alpha", 'one;"two;three"']);
	});
});
