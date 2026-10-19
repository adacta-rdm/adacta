import { describe, expect, test } from "bun:test";

import { sidecarBundle } from "../sidecarBundle.ts";

describe("sidecarBundle", () => {
	test("returns the files of a bundle with their selected fields", () => {
		const csv = { originalName: "data.csv", id: 1 };
		const toml = { originalName: "data.toml", id: 2 };

		const result = sidecarBundle([toml, csv]);

		expect(result?.csv).toBe(csv);
		expect(result?.toml).toBe(toml);
		expect(result?.csv.id).toBe(1);
	});

	test("accepts upper-case extensions", () => {
		const csv = { originalName: "data.CSV" };
		const toml = { originalName: "data.TOML" };

		const result = sidecarBundle([csv, toml]);

		expect(result).toEqual({ csv, toml });
	});

	test("rejects an upload with a third file", () => {
		const files = ["data.csv", "data.toml", "notes.txt"].map((originalName) => ({ originalName }));

		const result = sidecarBundle(files);

		expect(result).toBeUndefined();
	});

	test("rejects two CSV files", () => {
		const files = ["first.csv", "second.csv"].map((originalName) => ({ originalName }));

		const result = sidecarBundle(files);

		expect(result).toBeUndefined();
	});
});
