import { describe, expect, test } from "bun:test";

import { createFileProbe } from "~/app/lib/FileProbe.ts";
import {
	buildMeasurementSidecarSkeleton,
	parseMeasurementSidecar,
	readCsvSidecarPreview,
	stringifyMeasurementSidecar,
} from "~/app/lib/measurementSidecar.ts";
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
	test("serializes a skeleton that the TOML parser can read", () => {
		const skeleton = buildMeasurementSidecarSkeleton(
			[{ symbolKey: "P-101", itemSlug: "feed-pump", channel: "flow", role: "measurement" }],
			"operator@example.org",
		);
		const source = stringifyMeasurementSidecar(skeleton);
		const parsed = parseMeasurementSidecar(source);

		expect(parsed.issues).toEqual([
			{ path: "columns.0.timezone", message: "Expected a valid timezone." },
			{
				path: "columns.0.format",
				message: "The timestamp format contains unsupported or incomplete directives.",
			},
		]);
		expect(source).toContain("samples = []");
		expect(source).toContain('symbol_key = "P-101"');
		expect(source).toContain('item.slug = "feed-pump"');
		expect(source).not.toContain("[columns.item]");
	});

	test("locates TODOs and diagram references in TOML", () => {
		const source = stringifyMeasurementSidecar(
			buildMeasurementSidecarSkeleton(
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
		expect(parseMeasurementSidecar(legacySource).issues).toEqual(
			parseMeasurementSidecar(source).issues,
		);
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

	test("filters timezone suggestions by the text inside TOML quotes", () => {
		const source = '[[columns]]\naxis = "time"\ntimezone = "Europe/"\nformat = "TODO"';
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
		const combined = '[[columns]]\naxis = "time"\nformat = "TODO"';
		const combinedPosition = combined.indexOf('format = "TODO') + 'format = "TODO'.length;
		const combinedResult = analyzeTomlSidecar(combined, nodes).suggestions(combinedPosition);
		expect(combinedResult?.filter).toBe(false);
		expect(combinedResult?.options[0]?.label).toBe("%Y-%m-%dT%H:%M:%S");
		expect(combinedResult?.options[0]?.apply).toBe('"%Y-%m-%dT%H:%M:%S"');

		const split =
			'[[columns]]\naxis = "date"\nformat = "TODO"\n[[columns]]\naxis = "time"\nformat = "TODO"';
		const datePosition = split.indexOf('format = "TODO') + 'format = "TODO'.length;
		const timePosition = split.lastIndexOf('format = "TODO') + 'format = "TODO'.length;
		expect(analyzeTomlSidecar(split, nodes).suggestions(datePosition)?.options[0]?.label).toBe(
			"%Y-%m-%d",
		);
		expect(analyzeTomlSidecar(split, nodes).suggestions(timePosition)?.options[0]?.label).toBe(
			"%H:%M:%S",
		);
	});

	test("reports invalid TOML and mismatched equipment", () => {
		const source = stringifyMeasurementSidecar(
			buildMeasurementSidecarSkeleton(
				[{ symbolKey: "P-101", itemSlug: "other-pump", channel: "flow", role: "measurement" }],
				"operator@example.org",
			),
		)
			.replace('format = "TODO"', 'format = "%Y-%m-%d %H:%M:%S"')
			.replace('timezone = "TODO"', 'timezone = "UTC"')
			.replace('unit = "TODO"', 'unit = "mL/min"');
		expect(
			analyzeTomlSidecar(source, nodes).issues.find((issue) =>
				issue.message.includes("item does not match"),
			)?.from,
		).toBe(source.indexOf('"other-pump"'));
		expect(analyzeTomlSidecar("[file_structure\n", nodes).issues.length).toBeGreaterThan(0);
	});

	test("shows the CSV header beside the sidecar columns", async () => {
		const skeleton = buildMeasurementSidecarSkeleton(
			[{ symbolKey: "P-101", itemSlug: "feed-pump", channel: "flow", role: "measurement" }],
			"operator@example.org",
		);
		const source = stringifyMeasurementSidecar(skeleton)
			.replace('format = "TODO"', 'format = "%Y-%m-%dT%H:%M:%SZ"')
			.replace('timezone = "TODO"', 'timezone = "UTC"')
			.replace('unit = "TODO"', 'unit = "mL/min"');
		const parsed = parseMeasurementSidecar(source);
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
		const source = stringifyMeasurementSidecar(
			buildMeasurementSidecarSkeleton([], "operator@example.org"),
		)
			.replace('format = "TODO"', 'format = "%Y-%m-%d %H:%M:%S"')
			.replace('timezone = "TODO"', 'timezone = "Europe/Berlin"');
		const sidecar = parseMeasurementSidecar(source).sidecar!;
		const csv = new File(["timestamp\n2026-01-15 10:00:00\nnot-a-timestamp\n"], "measurements.csv");
		const preview = await readCsvSidecarPreview(createFileProbe(csv), sidecar);

		expect(preview.timestamp?.interpreted).toBe("2026-01-15T09:00:00.000Z");
		expect(preview.issues).toContainEqual({
			path: "data_row.3.timestamp",
			message: "Row 3: invalid or ambiguous timestamp for the sidecar format and timezone.",
		});
	});
});
