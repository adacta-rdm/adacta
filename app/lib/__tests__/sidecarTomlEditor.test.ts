import { describe, expect, test } from "bun:test";

import { createFileProbe } from "~/app/lib/FileProbe.ts";
import {
	buildDatasetSidecarSkeleton,
	parseDatasetSidecar,
	readCsvSidecarPreview,
	stringifyDatasetSidecar,
} from "~/app/lib/datasetSidecar.ts";
import { analyzeTomlSidecar } from "~/app/lib/sidecarTomlEditor.ts";

const nodes = [
	{
		id: "pump",
		kind: "equipment" as const,
		label: "Pump",
		symbolKey: "P-101",
		equipment: {
			id: 12,
			slug: "feed-pump",
			serialNumber: null,
			channels: [{ key: "flow", role: "measurement" }],
		},
	},
];

describe("TOML sidecar editor", () => {
	test("accepts a numeric x axis and previews values with a decimal comma", async () => {
		const source = stringifyDatasetSidecar({
			file_structure: {
				column_delimiter: ";",
				decimal_separator: ",",
				header_rows: 1,
				data_row: 2,
				file_encoding: "UTF-8",
			},
			experiment: { operator_email: "operator@example.org", samples: [] },
			columns: [
				{ name: "Position", axis: "numeric", unit: "mm" },
				{
					name: "Flow",
					symbol_key: "P-101",
					item: { slug: "feed-pump" },
					channel: "flow",
					role: "measurement",
					unit: "mL/min",
				},
			],
		});
		const parsed = parseDatasetSidecar(source);
		const preview = await readCsvSidecarPreview(
			createFileProbe(new File(["Position;Flow\n0,5;12,0\n"], "scan.csv")),
			parsed.sidecar!,
		);

		expect(parsed.issues).toEqual([]);
		expect(preview.numericAxis).toEqual({ source: "0,5", unit: "mm", interpreted: 0.5 });
		expect(preview.issues).toEqual([]);
		expect(analyzeTomlSidecar(source, nodes).issues).toEqual([]);
		const partial = '[[columns]]\naxis = "num"';
		expect(
			analyzeTomlSidecar(partial, nodes).suggestions(partial.indexOf("num") + 3)?.options,
		).toContainEqual({ label: "numeric", apply: '"numeric"', type: "constant" });
	});

	test("requires one x axis and a complete optional numeric-axis mapping", () => {
		const base =
			'[file_structure]\ncolumn_delimiter = ","\ndecimal_separator = "."\nheader_rows = 1\ndata_row = 2\nfile_encoding = "UTF-8"\n[experiment]\noperator_email = "operator@example.org"\nsamples = []\n';
		const numeric = '[[columns]]\nname = "Position"\naxis = "numeric"\nunit = "mm"\n';
		const time =
			'[[columns]]\nname = "Time"\naxis = "time"\nformat = "%Y-%m-%dT%H:%M:%SZ"\ntimezone = "UTC"\n';
		const linked = `${numeric}symbol_key = "P-101"\nitem.slug = "feed-pump"\nchannel = "flow"\nrole = "measurement"\n`;

		expect(parseDatasetSidecar(base + linked).issues).toEqual([]);
		expect(parseDatasetSidecar(base + numeric + time).issues).toContainEqual({
			path: "columns",
			message: "Define exactly one time or numeric axis column.",
		});
		expect(parseDatasetSidecar(base + numeric + numeric).issues).toContainEqual({
			path: "columns",
			message: "Define exactly one time or numeric axis column.",
		});
		expect(
			parseDatasetSidecar(base + numeric.replace('unit = "mm"', 'symbol_key = "P-101"')).issues,
		).toContainEqual({
			path: "columns.0",
			message: "Provide all of symbol_key, item, channel, and role for a linked numeric axis.",
		});
	});

	test("serializes a skeleton that the TOML parser can read", () => {
		const skeleton = buildDatasetSidecarSkeleton(
			[{ symbolKey: "P-101", itemSlug: "feed-pump", channel: "flow", role: "measurement" }],
			"operator@example.org",
		);
		const source = stringifyDatasetSidecar(skeleton);
		const parsed = parseDatasetSidecar(source);

		expect(parsed.issues).toEqual([
			{ path: "columns.0.timezone", message: "Expected a valid timezone." },
			{
				path: "columns.0.format",
				message: "The timestamp format contains unsupported or incomplete directives.",
			},
		]);
		expect(source).toContain("samples = []");
		expect(source).toContain('format = "<VALUE>"');
		expect(source).toContain('timezone = "<VALUE>"');
		expect(source).toContain('unit = "<VALUE>"');
		expect(source).toContain('symbol_key = "P-101"');
		expect(source).toContain('item.slug = "feed-pump"');
		expect(source).not.toContain("[columns.item]");
	});

	test("locates values to complete and diagram references in TOML", () => {
		const source = stringifyDatasetSidecar(
			buildDatasetSidecarSkeleton(
				[{ symbolKey: "P-101", itemSlug: "feed-pump", channel: "flow", role: "measurement" }],
				"operator@example.org",
			),
		);
		const analysis = analyzeTomlSidecar(source, nodes);
		expect(analysis.todos.map((todo) => todo.path)).toEqual([
			"columns.0.format",
			"columns.0.timezone",
			"columns.1.unit",
		]);
		expect(analysis.references).toContainEqual({
			path: "columns.1.symbol_key",
			key: "P-101",
			from: source.indexOf('"P-101"') + 1,
			to: source.indexOf('"P-101"') + 6,
		});
		expect(analysis.issues).toEqual([]);
		expect(
			analyzeTomlSidecar(source.replace('unit = "<VALUE>"', 'unit = "TODO"'), nodes).todos,
		).toHaveLength(2);
		expect(
			analysis.suggestions(source.indexOf('timezone = "<VALUE>"') + 'timezone = "<VALUE>'.length)
				?.options,
		).toContainEqual({
			label: "UTC",
			apply: "UTC",
			type: "constant",
		});
		expect(analysis.rangeForPath("columns.0.name")).toEqual([
			source.indexOf('"timestamp"'),
			source.indexOf('"timestamp"') + '"timestamp"'.length,
		]);
		expect(
			analysis.suggestions(source.indexOf('item.slug = "feed-pump"') + 'item.slug = "'.length)
				?.options,
		).toContainEqual({ label: "feed-pump", apply: '"feed-pump"', type: "constant" });
		expect(analysis.suggestions(source.indexOf("item.slug") + 5)?.options).toContainEqual({
			label: "item.slug",
			apply: "item.slug",
			type: "property",
		});
		const legacySource = source.replace(
			'item.slug = "feed-pump"',
			'[columns.item]\nslug = "feed-pump"',
		);
		expect(parseDatasetSidecar(legacySource).issues).toEqual(parseDatasetSidecar(source).issues);
		expect(
			analyzeTomlSidecar(legacySource, nodes).suggestions(
				legacySource.indexOf('slug = "feed-pump"') + 2,
			)?.options,
		).toContainEqual({ label: "slug", apply: "slug", type: "property" });
		const unfinished = '[file_structure]\ncolumn_delimiter = ","\nheader_rows = 1\nfile_enc';
		expect(
			analyzeTomlSidecar(unfinished, nodes).suggestions(unfinished.length)?.options,
		).toContainEqual({
			label: "file_encoding",
			apply: "file_encoding = ",
			type: "property",
		});
	});

	test("finds complete column blocks in an incomplete sidecar", () => {
		const source = [
			"[experiment]",
			'operator_email = "operator@example.org"',
			"[[columns]]",
			'name = "Flow"',
			'symbol_key = "P-101"',
			'unit = "<VALUE>"',
			"[columns.item]",
			'slug = "feed-pump"',
			"[[columns]]",
			'name = "Other flow"',
			'symbol_key = "P-101"',
			"[[columns]]",
			'name = "Time"',
			'axis = "time"',
			"[file_structure]",
			'column_delimiter = ","',
		].join("\n");
		const analysis = analyzeTomlSidecar(source, nodes);
		const first = source.indexOf("[[columns]]");
		const second = source.indexOf("[[columns]]", first + 1);
		const third = source.indexOf("[[columns]]", second + 1);
		const end = source.indexOf("[file_structure]");

		expect(analysis.columnBlocks).toEqual([
			{ index: 0, from: first, to: second, symbolKey: "P-101" },
			{ index: 1, from: second, to: third, symbolKey: "P-101" },
			{ index: 2, from: third, to: end, symbolKey: null },
		]);
		expect(analysis.columnBlockAt(source.indexOf('slug = "feed-pump"'))?.index).toBe(0);
		expect(analysis.columnBlockAt(source.indexOf('unit = "<VALUE>"'))?.symbolKey).toBe("P-101");
		expect(analysis.columnBlockAt(second)?.index).toBe(1);
		expect(analysis.columnBlockAt(end)).toBeUndefined();
		expect(analysis.columnBlockAt(source.length)).toBeUndefined();
		const finalBlock = '[[columns]]\nsymbol_key = "P-101"';
		expect(analyzeTomlSidecar(finalBlock, nodes).columnBlockAt(finalBlock.length)?.index).toBe(0);
	});

	test("filters timezone suggestions by the text inside TOML quotes", () => {
		const source = '[[columns]]\naxis = "time"\ntimezone = "Europe/"\nformat = "<VALUE>"';
		const position = source.indexOf('timezone = "Europe/') + 'timezone = "Europe/'.length;
		const result = analyzeTomlSidecar(source, nodes).suggestions(position);

		expect(result?.filter).toBeUndefined();
		expect(result?.options.some((option) => option.label.startsWith("Europe/"))).toBe(true);
		expect(result?.options.some((option) => option.label.startsWith("America/"))).toBe(false);
		expect(result?.from).toBe(source.indexOf('"Europe/"') + 1);
		expect(result?.options.find((option) => option.label === "Europe/Berlin")?.apply).toBe(
			"Europe/Berlin",
		);
	});

	test("suggests complete timestamp formats for combined and split axes", () => {
		const combined = '[[columns]]\naxis = "time"\nformat = "<VALUE>"';
		const combinedPosition = combined.indexOf('format = "<VALUE>') + 'format = "<VALUE>'.length;
		const combinedResult = analyzeTomlSidecar(combined, nodes).suggestions(combinedPosition);
		expect(combinedResult?.filter).toBe(false);
		expect(combinedResult?.options[0]?.label).toBe("%Y-%m-%dT%H:%M:%S");
		expect(combinedResult?.options[0]?.apply).toBe('"%Y-%m-%dT%H:%M:%S"');

		const split =
			'[[columns]]\naxis = "date"\nformat = "<VALUE>"\n[[columns]]\naxis = "time"\nformat = "<VALUE>"';
		const datePosition = split.indexOf('format = "<VALUE>') + 'format = "<VALUE>'.length;
		const timePosition = split.lastIndexOf('format = "<VALUE>') + 'format = "<VALUE>'.length;
		expect(analyzeTomlSidecar(split, nodes).suggestions(datePosition)?.options[0]?.label).toBe(
			"%Y-%m-%d",
		);
		expect(analyzeTomlSidecar(split, nodes).suggestions(timePosition)?.options[0]?.label).toBe(
			"%H:%M:%S",
		);
	});

	test("reports invalid TOML and mismatched equipment", () => {
		const source = stringifyDatasetSidecar(
			buildDatasetSidecarSkeleton(
				[{ symbolKey: "P-101", itemSlug: "other-pump", channel: "flow", role: "measurement" }],
				"operator@example.org",
			),
		)
			.replace('format = "<VALUE>"', 'format = "%Y-%m-%d %H:%M:%S"')
			.replace('timezone = "<VALUE>"', 'timezone = "UTC"')
			.replace('unit = "<VALUE>"', 'unit = "mL/min"');
		expect(
			analyzeTomlSidecar(source, nodes).issues.find((issue) =>
				issue.message.includes("item does not match"),
			)?.from,
		).toBe(source.indexOf('"other-pump"'));
		expect(analyzeTomlSidecar("[file_structure\n", nodes).issues.length).toBeGreaterThan(0);
	});

	test("shows the CSV header beside the sidecar columns", async () => {
		const skeleton = buildDatasetSidecarSkeleton(
			[{ symbolKey: "P-101", itemSlug: "feed-pump", channel: "flow", role: "measurement" }],
			"operator@example.org",
		);
		const source = stringifyDatasetSidecar(skeleton)
			.replace('format = "<VALUE>"', 'format = "%Y-%m-%dT%H:%M:%SZ"')
			.replace('timezone = "<VALUE>"', 'timezone = "UTC"')
			.replace('unit = "<VALUE>"', 'unit = "mL/min"');
		const parsed = parseDatasetSidecar(source);
		expect(parsed.sidecar).toBeDefined();
		const csv = new File(["timestamp,P-101_flow\n2026-10-08T09:00:00Z,12\n"], "measurements.csv");
		const preview = await readCsvSidecarPreview(createFileProbe(csv), parsed.sidecar!);

		expect(preview.header).toEqual(["timestamp", "P-101_flow"]);
		expect(preview.rows[0]).toEqual(["2026-10-08T09:00:00Z", "12"]);
		expect(preview.issues).toEqual([]);
		expect(preview.timestamp).toEqual({
			source: "2026-10-08T09:00:00Z",
			format: "%Y-%m-%dT%H:%M:%SZ",
			timezone: "UTC",
			interpreted: "2026-10-08T09:00:00.000Z",
		});
	});

	test("previews the import timestamp in its selected timezone and reports invalid rows", async () => {
		const source = stringifyDatasetSidecar(buildDatasetSidecarSkeleton([], "operator@example.org"))
			.replace('format = "<VALUE>"', 'format = "%Y-%m-%d %H:%M:%S"')
			.replace('timezone = "<VALUE>"', 'timezone = "Europe/Berlin"');
		const sidecar = parseDatasetSidecar(source).sidecar!;
		const csv = new File(["timestamp\n2026-01-15 10:00:00\nnot-a-timestamp\n"], "measurements.csv");
		const preview = await readCsvSidecarPreview(createFileProbe(csv), sidecar);

		expect(preview.timestamp?.interpreted).toBe("2026-01-15T09:00:00.000Z");
		expect(preview.issues).toContainEqual({
			path: "data_row.3.timestamp",
			message: "Row 3: invalid or ambiguous timestamp for the sidecar format and timezone.",
		});
	});
});
