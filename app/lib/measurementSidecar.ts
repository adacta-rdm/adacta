import { parse as parseToml } from "smol-toml";

import type { FileProbe } from "~/app/lib/FileProbe.ts";
import { CsvRecordParser, MeasurementCsvError } from "~/app/lib/measurementCsv.ts";

export { parseDelimitedRows } from "~/app/lib/measurementCsv.ts";

export const SIDECAR_PREVIEW_ROWS = 5;
export const SIDECAR_READ_LIMIT = 256 * 1024;

export type ChannelRole = "measurement" | "setpoint" | "state" | "status";

export const TIMESTAMP_FORMAT_TOKENS = [
	{ label: "%Y", detail: "Four-digit year", axis: "date" },
	{ label: "%m", detail: "Two-digit month", axis: "date" },
	{ label: "%d", detail: "Two-digit day", axis: "date" },
	{ label: "%H", detail: "Hour (00–23)", axis: "time" },
	{ label: "%M", detail: "Minute", axis: "time" },
	{ label: "%S", detail: "Second", axis: "time" },
	{ label: "%L", detail: "Millisecond", axis: "time" },
] as const;

export type SidecarItem = { id: number } | { slug: string } | { serial_number: string };
export type SidecarSample = { symbol_key: string } & ({ id: number } | { slug: string });

export type SidecarTimeColumn = {
	name: string;
	axis: "time";
	format: string;
	timezone: string;
};

export type SidecarDateColumn = {
	name: string;
	axis: "date";
	format: string;
	timezone: string;
};

export type SidecarSkippedColumn = { name: string; skip: true };

export type SidecarChannelColumn = {
	name: string;
	symbol_key: string;
	item: SidecarItem;
	channel: string;
	role: ChannelRole;
	unit: string;
};

export type SidecarColumn =
	| SidecarTimeColumn
	| SidecarDateColumn
	| SidecarSkippedColumn
	| SidecarChannelColumn;

export interface MeasurementSidecar {
	file_structure: {
		column_delimiter: string;
		decimal_separator: "." | ",";
		header_rows: number;
		data_row: number;
		file_encoding: "UTF-8";
	};
	experiment: {
		operator_email: string;
		samples: SidecarSample[];
	};
	columns: SidecarColumn[];
}

export interface SidecarIssue {
	path: string;
	message: string;
}

export type SidecarParseResult =
	| { sidecar: MeasurementSidecar; issues: [] }
	| { sidecar?: undefined; issues: SidecarIssue[] };

export interface SidecarSkeletonChannel {
	symbolKey: string;
	itemSlug: string;
	channel: string;
	role: ChannelRole;
}

export type MeasurementSidecarPair =
	| { status: "none" }
	| { status: "ambiguous"; message: string }
	| { status: "paired"; csv: File; sidecar: File };

/**
 * Find the unambiguous CSV/TOML pair in a browser source bundle.
 */
export function findMeasurementSidecarPair(files: File[]): MeasurementSidecarPair {
	const csv = files.filter((file) => extension(file.name) === "csv");
	const sidecars = files.filter((file) => extension(file.name) === "toml");
	if (csv.length === 0 && sidecars.length === 0) return { status: "none" };
	if (files.length === 2 && csv.length === 1 && sidecars.length === 1)
		return { status: "paired", csv: csv[0]!, sidecar: sidecars[0]! };
	if (csv.length === 0)
		return { status: "ambiguous", message: "Add one CSV file for this TOML sidecar." };
	if (sidecars.length === 0)
		return { status: "ambiguous", message: "Add one TOML sidecar for this CSV file." };
	return {
		status: "ambiguous",
		message: "A sidecar preview needs exactly one CSV and one TOML file in the bundle.",
	};
}

/**
 * Parse TOML and validate the portable sidecar fields.
 */
export function parseMeasurementSidecar(source: string): SidecarParseResult {
	try {
		return parseMeasurementSidecarValue(parseToml(source));
	} catch (error) {
		return {
			issues: [
				{
					path: "toml",
					message: error instanceof Error ? error.message : "The TOML could not be parsed.",
				},
			],
		};
	}
}

export function parseMeasurementSidecarValue(value: unknown): SidecarParseResult {
	const issues: SidecarIssue[] = [];
	if (!isRecord(value)) {
		return { issues: [{ path: "toml", message: "The sidecar must contain a TOML table." }] };
	}

	rejectUnknown(value, ["file_structure", "experiment", "columns"], "", issues);
	const fileStructure = parseFileStructure(value.file_structure, issues);
	const experiment = parseExperiment(value.experiment, issues);
	const columns = parseColumns(value.columns, issues);

	if (!fileStructure || !experiment || !columns || issues.length > 0) return { issues };
	return { sidecar: { file_structure: fileStructure, experiment, columns }, issues: [] };
}

/**
 * Reads at most 256 KiB. Sidecars are configuration, not bulk data, and an
 * unexpectedly large one should not be loaded into the browser unchecked.
 */
export async function readMeasurementSidecar(source: FileProbe): Promise<SidecarParseResult> {
	if (source.size > SIDECAR_READ_LIMIT) {
		return {
			issues: [
				{
					path: "toml",
					message: `The sidecar is larger than ${SIDECAR_READ_LIMIT / 1024} KB.`,
				},
			],
		};
	}

	const bytes = await source.read(0, SIDECAR_READ_LIMIT);
	try {
		return parseMeasurementSidecar(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
	} catch {
		return {
			issues: [{ path: "toml", message: "The TOML sidecar is not valid UTF-8." }],
		};
	}
}

export function delimiterCharacter(value: string): string {
	switch (value.toLowerCase()) {
		case "tab":
			return "\t";
		case "comma":
			return ",";
		case "semicolon":
			return ";";
		default:
			return value;
	}
}

export interface CsvSidecarPreview {
	columns: string[];
	rows: string[][];
	issues: SidecarIssue[];
	truncated: boolean;
}

export async function readCsvSidecarPreview(
	source: FileProbe,
	sidecar: MeasurementSidecar,
): Promise<CsvSidecarPreview> {
	const bytes = await source.read(0, SIDECAR_READ_LIMIT);
	const truncated = source.size > bytes.byteLength;
	let text: string;
	try {
		text = new TextDecoder("utf-8", { fatal: true }).decode(bytes, { stream: truncated });
	} catch {
		return {
			columns: sidecar.columns.map((column) => column.name),
			rows: [],
			issues: [{ path: "file_structure.file_encoding", message: "The CSV is not valid UTF-8." }],
			truncated,
		};
	}

	const rowLimit = Math.max(
		sidecar.file_structure.header_rows,
		sidecar.file_structure.data_row - 1 + SIDECAR_PREVIEW_ROWS,
	);
	const parser = new CsvRecordParser(delimiterCharacter(sidecar.file_structure.column_delimiter));
	let rows: string[][];
	try {
		rows = parser.push(text, rowLimit);
		if (!truncated && rows.length < rowLimit) rows.push(...parser.finish());
	} catch (error) {
		if (!(error instanceof MeasurementCsvError)) throw error;
		return {
			columns: sidecar.columns.map((column) => column.name),
			rows: [],
			issues: [{ path: "csv", message: error.message }],
			truncated,
		};
	}
	const issues: SidecarIssue[] = [];
	const expectedNames = sidecar.columns.map((column) => column.name);

	if (sidecar.file_structure.header_rows > 0) {
		const header = rows[sidecar.file_structure.header_rows - 1];
		if (!header) {
			issues.push({
				path: "columns",
				message: "The CSV does not contain the configured header row.",
			});
		} else {
			const mismatches = expectedNames.flatMap((name, index) =>
				header[index] === name ? [] : [index + 1],
			);
			if (header.length !== expectedNames.length || mismatches.length > 0) {
				issues.push({
					path: "columns",
					message: "The sidecar column order does not match the CSV header.",
				});
			}
		}
	}

	const dataRows = rows
		.slice(sidecar.file_structure.data_row - 1)
		.map((row) => normalizeSkippedSourceRow(row, sidecar.columns));
	for (const [index, row] of dataRows.entries()) {
		if (row.length !== expectedNames.length) {
			issues.push({
				path: `data_row.${sidecar.file_structure.data_row + index}`,
				message: `Expected ${expectedNames.length} columns but found ${row.length}.`,
			});
		}
	}

	return {
		columns: expectedNames,
		rows: dataRows.slice(0, SIDECAR_PREVIEW_ROWS),
		issues,
		truncated: truncated || dataRows.length >= SIDECAR_PREVIEW_ROWS,
	};
}

/**
 * Add a trailing empty field when the source omits its blank header column in data rows.
 */
export function normalizeSkippedSourceRow(row: string[], columns: SidecarColumn[]): string[] {
	const last = columns.at(-1);
	if (row.length === columns.length - 1 && last && "skip" in last && last.name === "")
		return [...row, ""];
	return row;
}

export function buildMeasurementSidecarSkeleton(
	channels: SidecarSkeletonChannel[],
	operatorEmail: string,
	samples: SidecarSample[] = [],
): MeasurementSidecar {
	return {
		file_structure: {
			column_delimiter: ",",
			decimal_separator: ".",
			header_rows: 1,
			data_row: 2,
			file_encoding: "UTF-8",
		},
		experiment: {
			operator_email: operatorEmail,
			samples,
		},
		columns: [
			{
				name: "timestamp",
				axis: "time",
				format: "TODO",
				timezone: "TODO",
			},
			...channels.map((channel) => ({
				name: `${channel.symbolKey}_${channel.channel}${channel.role === "measurement" ? "" : `_${channel.role}`}`,
				symbol_key: channel.symbolKey,
				item: { slug: channel.itemSlug },
				channel: channel.channel,
				role: channel.role,
				unit: "TODO",
			})),
		],
	};
}

export function stringifyMeasurementSidecar(sidecar: MeasurementSidecar): string {
	const quoted = (value: string) => JSON.stringify(value);
	const lines = [
		"[file_structure]",
		`column_delimiter = ${quoted(sidecar.file_structure.column_delimiter)}`,
		`decimal_separator = ${quoted(sidecar.file_structure.decimal_separator)}`,
		`header_rows = ${sidecar.file_structure.header_rows}`,
		`data_row = ${sidecar.file_structure.data_row}`,
		`file_encoding = ${quoted(sidecar.file_structure.file_encoding)}`,
		"",
		"[experiment]",
		`operator_email = ${quoted(sidecar.experiment.operator_email)}`,
	];
	if (sidecar.experiment.samples.length === 0) lines.push("samples = []");
	for (const sample of sidecar.experiment.samples) {
		lines.push("", "[[experiment.samples]]", `symbol_key = ${quoted(sample.symbol_key)}`);
		if ("id" in sample) lines.push(`id = ${sample.id}`);
		else lines.push(`slug = ${quoted(sample.slug)}`);
	}
	for (const column of sidecar.columns) {
		lines.push("", "[[columns]]", `name = ${quoted(column.name)}`);
		if ("axis" in column) {
			lines.push(
				`axis = ${quoted(column.axis)}`,
				`format = ${quoted(column.format)}`,
				`timezone = ${quoted(column.timezone)}`,
			);
		} else if ("skip" in column) {
			lines.push("skip = true");
		} else {
			lines.push(
				`symbol_key = ${quoted(column.symbol_key)}`,
				`channel = ${quoted(column.channel)}`,
				`role = ${quoted(column.role)}`,
				`unit = ${quoted(column.unit)}`,
			);
			lines.push("[columns.item]");
			if ("id" in column.item) lines.push(`id = ${column.item.id}`);
			else if ("slug" in column.item) lines.push(`slug = ${quoted(column.item.slug)}`);
			else lines.push(`serial_number = ${quoted(column.item.serial_number)}`);
		}
	}
	return `${lines.join("\n")}\n`;
}

function parseFileStructure(value: unknown, issues: SidecarIssue[]) {
	const path = "file_structure";
	if (!isRecord(value)) {
		issues.push({ path, message: "Expected an object." });
		return;
	}
	rejectUnknown(
		value,
		["column_delimiter", "decimal_separator", "header_rows", "data_row", "file_encoding"],
		path,
		issues,
	);
	const headerRows = integer(value.header_rows, `${path}.header_rows`, 0, issues);
	const dataRow = integer(value.data_row, `${path}.data_row`, 1, issues);
	const delimiter = nonEmptyString(value.column_delimiter, `${path}.column_delimiter`, issues);
	const decimal = value.decimal_separator;
	const encoding = value.file_encoding;

	if (delimiter !== undefined && delimiterCharacter(delimiter).length !== 1) {
		issues.push({
			path: `${path}.column_delimiter`,
			message: "Use tab, comma, semicolon, or one character.",
		});
	}
	if (decimal !== "." && decimal !== ",") {
		issues.push({ path: `${path}.decimal_separator`, message: 'Expected "." or ",".' });
	}
	if (encoding !== "UTF-8") {
		issues.push({ path: `${path}.file_encoding`, message: "Only UTF-8 is supported." });
	}
	if (headerRows !== undefined && dataRow !== undefined && dataRow <= headerRows) {
		issues.push({
			path: `${path}.data_row`,
			message: "Must come after the configured header rows.",
		});
	}

	if (
		headerRows === undefined ||
		dataRow === undefined ||
		delimiter === undefined ||
		(decimal !== "." && decimal !== ",") ||
		encoding !== "UTF-8"
	) {
		return;
	}

	return {
		column_delimiter: delimiter,
		decimal_separator: decimal,
		header_rows: headerRows,
		data_row: dataRow,
		file_encoding: encoding,
	} as MeasurementSidecar["file_structure"];
}

function parseExperiment(value: unknown, issues: SidecarIssue[]) {
	const path = "experiment";
	if (!isRecord(value)) {
		issues.push({ path, message: "Expected an object." });
		return;
	}
	rejectUnknown(value, ["operator_email", "samples"], path, issues);
	const operatorEmail = nonEmptyString(value.operator_email, `${path}.operator_email`, issues);
	if (!Array.isArray(value.samples)) {
		issues.push({ path: `${path}.samples`, message: "Expected an array of samples." });
		return;
	}
	const samples = value.samples.flatMap((sample, index) => {
		const parsed = parseSample(sample, `${path}.samples.${index}`, issues);
		return parsed ? [parsed] : [];
	});
	if (operatorEmail === undefined) return;
	return { operator_email: operatorEmail, samples };
}

function parseSample(
	value: unknown,
	path: string,
	issues: SidecarIssue[],
): SidecarSample | undefined {
	if (!isRecord(value)) {
		issues.push({
			path,
			message: "Expected an object containing a symbol key and sample identifier.",
		});
		return;
	}
	rejectUnknown(value, ["symbol_key", "id", "slug"], path, issues);
	const symbolKey = nonEmptyString(value.symbol_key, `${path}.symbol_key`, issues);
	const identifiers = ["id", "slug"].filter((key) => key in value);
	if (identifiers.length !== 1) {
		issues.push({ path, message: "Provide exactly one of id or slug." });
		return;
	}
	if (!symbolKey) return;
	if (identifiers[0] === "id") {
		const id = integer(value.id, `${path}.id`, 1, issues);
		return id === undefined ? undefined : { symbol_key: symbolKey, id };
	}
	const slug = nonEmptyString(value.slug, `${path}.slug`, issues);
	return slug === undefined ? undefined : { symbol_key: symbolKey, slug };
}

function parseColumns(value: unknown, issues: SidecarIssue[]): SidecarColumn[] | undefined {
	if (!Array.isArray(value)) {
		issues.push({
			path: "columns",
			message: "Expected an ordered array of columns.",
		});
		return;
	}

	const columns = value.flatMap((column, index) => {
		const parsed = parseColumn(column, index, issues);
		return parsed ? [parsed] : [];
	});
	if (columns.length === 0)
		issues.push({ path: "columns", message: "Define at least one column." });
	const dates = columns.filter((column) => "axis" in column && column.axis === "date");
	const times = columns.filter((column) => "axis" in column && column.axis === "time");
	if (dates.length === 0 && times.length !== 1)
		issues.push({ path: "columns", message: "Define exactly one time-axis column." });
	if (dates.length > 0 && (dates.length !== 1 || times.length !== 1))
		issues.push({
			path: "columns",
			message: "Define exactly one date-axis column and one time-axis column.",
		});
	if (dates.length === 1 && times.length === 1) {
		if (dates[0]!.timezone !== times[0]!.timezone)
			issues.push({
				path: "columns",
				message: "Date and time columns must use the same timezone.",
			});
		for (const column of [dates[0]!, times[0]!]) {
			if (!validTimestampFormat(column.format, column.axis))
				issues.push({
					path: `columns.${columns.indexOf(column)}.format`,
					message: `The ${column.axis} format contains unsupported or incomplete directives.`,
				});
		}
	} else if (dates.length === 0 && times.length === 1) {
		const column = times[0]!;
		if (!validTimestampFormat(column.format, "combined"))
			issues.push({
				path: `columns.${columns.indexOf(column)}.format`,
				message: "The timestamp format contains unsupported or incomplete directives.",
			});
	}
	return columns;
}

function parseColumn(
	value: unknown,
	index: number,
	issues: SidecarIssue[],
): SidecarColumn | undefined {
	const path = `columns.${index}`;
	if (!isRecord(value)) {
		issues.push({ path, message: "Expected an object." });
		return;
	}
	if (value.skip === true) {
		rejectUnknown(value, ["name", "skip"], path, issues);
		if (typeof value.name !== "string") {
			issues.push({ path: `${path}.name`, message: "Expected a string." });
			return;
		}
		return { name: value.name, skip: true };
	}
	const name = nonEmptyString(value.name, `${path}.name`, issues);
	if (value.axis === "time" || value.axis === "date") {
		rejectUnknown(value, ["name", "axis", "format", "timezone"], path, issues);
		const format = nonEmptyString(value.format, `${path}.format`, issues);
		const timezone = nonEmptyString(value.timezone, `${path}.timezone`, issues);
		if (timezone) {
			try {
				new Intl.DateTimeFormat("en-GB", { timeZone: timezone });
			} catch {
				issues.push({ path: `${path}.timezone`, message: "Expected a valid timezone." });
			}
		}
		return name && format && timezone ? { name, axis: value.axis, format, timezone } : undefined;
	}
	rejectUnknown(value, ["name", "symbol_key", "item", "channel", "role", "unit"], path, issues);
	const symbolKey = nonEmptyString(value.symbol_key, `${path}.symbol_key`, issues);
	const item = parseItem(value.item, `${path}.item`, issues);
	const channel = nonEmptyString(value.channel, `${path}.channel`, issues);
	const unit = nonEmptyString(value.unit, `${path}.unit`, issues);
	const role = value.role;
	if (!isChannelRole(role)) {
		issues.push({
			path: `${path}.role`,
			message: "Expected measurement, setpoint, state, or status.",
		});
	}
	return name && symbolKey && item && channel && unit && isChannelRole(role)
		? { name, symbol_key: symbolKey, item, channel, role, unit }
		: undefined;
}

function validTimestampFormat(format: string, axis: "date" | "time" | "combined"): boolean {
	const directives = [...format.matchAll(/%./g)].map(([directive]) => directive);
	if (format.replace(/%./g, "").includes("%")) return false;
	const allowed: string[] = TIMESTAMP_FORMAT_TOKENS.filter(
		(token) => axis === "combined" || token.axis === axis,
	).map((token) => token.label);
	if (
		new Set(directives).size !== directives.length ||
		directives.some((directive) => !allowed.includes(directive))
	)
		return false;
	const required =
		axis === "date"
			? ["%Y", "%m", "%d"]
			: axis === "time"
				? ["%H", "%M", "%S"]
				: ["%Y", "%m", "%d", "%H", "%M", "%S"];
	return required.every((directive) => directives.includes(directive));
}

function parseItem(value: unknown, path: string, issues: SidecarIssue[]): SidecarItem | undefined {
	if (!isRecord(value)) {
		issues.push({ path, message: "Expected an object containing one item identifier." });
		return;
	}
	const identifierKeys = ["id", "slug", "serial_number"] as const;
	rejectUnknown(value, [...identifierKeys], path, issues);
	const identifiers = identifierKeys.filter((key) => key in value);
	if (identifiers.length !== 1) {
		issues.push({ path, message: "Provide exactly one of id, slug, or serial_number." });
		return;
	}
	const key = identifiers[0]!;
	if (key === "id") {
		const id = integer(value.id, `${path}.id`, 1, issues);
		return id === undefined ? undefined : { id };
	}
	const identifier = nonEmptyString(value[key], `${path}.${key}`, issues);
	return identifier === undefined ? undefined : ({ [key]: identifier } as SidecarItem);
}

function rejectUnknown(
	value: Record<string, unknown>,
	allowed: string[],
	path: string,
	issues: SidecarIssue[],
) {
	for (const key of Object.keys(value)) {
		if (!allowed.includes(key)) {
			issues.push({ path: path ? `${path}.${key}` : key, message: "Unknown field." });
		}
	}
}

function integer(
	value: unknown,
	path: string,
	minimum: number,
	issues: SidecarIssue[],
): number | undefined {
	if (!Number.isInteger(value) || (value as number) < minimum) {
		issues.push({ path, message: `Expected an integer of at least ${minimum}.` });
		return;
	}
	return value as number;
}

function nonEmptyString(value: unknown, path: string, issues: SidecarIssue[]): string | undefined {
	if (typeof value !== "string" || value.length === 0) {
		issues.push({ path, message: "Expected a non-empty string." });
		return;
	}
	return value;
}

function isChannelRole(value: unknown): value is ChannelRole {
	return value === "measurement" || value === "setpoint" || value === "state" || value === "status";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extension(name: string): string {
	return name.split(".").at(-1)?.toLowerCase() ?? "";
}
