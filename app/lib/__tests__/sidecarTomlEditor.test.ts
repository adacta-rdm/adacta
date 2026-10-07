import { describe, expect, test } from "bun:test";

import {
	buildMeasurementSidecarSkeleton,
	parseMeasurementSidecar,
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
		expect(source).toContain("[columns.item]");
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
		const unfinished = '[file_structure]\ncolumn_delimiter = ","\nheader_rows = 1\nfile_enc';
		expect(
			analyzeTomlSidecar(unfinished, nodes).suggestions(unfinished.length)?.options,
		).toContainEqual({
			label: "file_encoding",
			apply: "file_encoding = ",
			type: "property",
		});
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
			analyzeTomlSidecar(source, nodes).issues.some((issue) =>
				issue.message.includes("item does not match"),
			),
		).toBe(true);
		expect(analyzeTomlSidecar("[file_structure\n", nodes).issues.length).toBeGreaterThan(0);
	});
});
