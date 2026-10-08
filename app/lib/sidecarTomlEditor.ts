import { parse as parseToml } from "smol-toml";

import {
	parseMeasurementSidecar,
	SIDECAR_READ_LIMIT,
	TIMESTAMP_FORMAT_TOKENS,
} from "~/app/lib/measurementSidecar.ts";
import type {
	SidecarEditorIssue,
	SidecarEditorNode,
	SidecarReference,
	SidecarTodo,
} from "~/app/lib/sidecarEditor.ts";

type Field = { path: string; key: [number, number]; value: [number, number] };

const timezones = [
	"UTC",
	...(typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : []),
];

const combinedFormats = [
	{ label: "%Y-%m-%dT%H:%M:%S", detail: "ISO date and time" },
	{ label: "%Y-%m-%dT%H:%M:%S.%L", detail: "ISO date and time with milliseconds" },
	{ label: "%Y-%m-%d %H:%M:%S", detail: "Date and time separated by a space" },
];
const dateFormats = [
	{ label: "%Y-%m-%d", detail: "ISO date" },
	{ label: "%d.%m.%Y", detail: "Day, month, year" },
];
const timeFormats = [
	{ label: "%H:%M:%S", detail: "Time to the second" },
	{ label: "%H:%M:%S.%L", detail: "Time with milliseconds" },
];

export function analyzeTomlSidecar(source: string, nodes: SidecarEditorNode[]) {
	const fields: Field[] = [];
	const references: SidecarReference[] = [];
	const todos: SidecarTodo[] = [];
	const issues: SidecarEditorIssue[] = [];
	const tables: { from: number; path: string }[] = [];
	let table = "";
	let columnIndex = -1;
	let sampleIndex = -1;
	let offset = 0;
	for (const line of source.split("\n")) {
		const header = line.match(/^\s*\[(\[?)([\w.]+)\]\]?\s*(?:#.*)?$/);
		if (header) {
			if (header[2] === "columns" && header[1]) columnIndex += 1;
			if (header[2] === "experiment.samples" && header[1]) sampleIndex += 1;
			table =
				header[2] === "columns"
					? `columns.${columnIndex}`
					: header[2] === "experiment.samples"
						? `experiment.samples.${sampleIndex}`
						: header[2] === "columns.item"
							? `columns.${columnIndex}.item`
							: header[2]!;
			tables.push({ from: offset, path: table });
		} else {
			const assignment = line.match(/^(\s*)([\w.]+)(\s*=\s*)(.*)$/);
			if (assignment) {
				const key = assignment[2]!;
				const from = offset + assignment[1]!.length;
				const valueFrom = from + key.length + assignment[3]!.length;
				const raw = assignment[4]!.replace(/\s+#.*$/, "").trimEnd();
				const valueTo = valueFrom + raw.length;
				const path = table ? `${table}.${key}` : key;
				fields.push({ path, key: [from, from + key.length], value: [valueFrom, valueTo] });
				if (raw === '"TODO"' || raw === "'TODO'")
					todos.push({ path, from: valueFrom + 1, to: valueTo - 1 });
				if (key === "symbol_key") {
					try {
						const value: unknown = parseToml(`value = ${raw}`).value;
						if (typeof value === "string")
							references.push({ path, key: value, from: valueFrom + 1, to: valueTo - 1 });
					} catch {
						/* The full parser reports incomplete values. */
					}
				}
			}
		}
		offset += line.length + 1;
	}
	const todoPaths = new Set(todos.map((todo) => todo.path));
	if (new TextEncoder().encode(source).length > SIDECAR_READ_LIMIT) {
		issues.push({ from: 0, to: 1, message: "The sidecar exceeds the 256 KB import limit." });
	} else {
		const result = parseMeasurementSidecar(source);
		for (const issue of result.issues) {
			if (todoPaths.has(issue.path)) continue;
			const field = fields.find((candidate) => candidate.path === issue.path);
			const range = field?.value ?? field?.key ?? [0, 1];
			issues.push({
				from: range[0],
				to: Math.max(range[1], range[0] + 1),
				message: `${issue.path}: ${issue.message}`,
			});
		}
		if (result.sidecar) {
			for (const reference of references) {
				const sample = reference.path.startsWith("experiment.samples.");
				const matches = nodes.filter(
					(node) =>
						node.symbolKey === reference.key && node.kind === (sample ? "sample" : "equipment"),
				);
				if (matches.length !== 1)
					issues.push({
						from: reference.from,
						to: reference.to,
						message: `Symbol ${reference.key} does not identify one ${sample ? "sample" : "equipment"} in this P&ID.`,
					});
			}
			for (const [index, column] of result.sidecar.columns.entries()) {
				if (!("symbol_key" in column)) continue;
				const node = nodes.find(
					(candidate) =>
						candidate.kind === "equipment" && candidate.symbolKey === column.symbol_key,
				);
				if (!node?.equipment) continue;
				const itemMatches =
					"id" in column.item
						? column.item.id === node.equipment.id
						: "slug" in column.item
							? column.item.slug === node.equipment.slug
							: column.item.serial_number === node.equipment.serialNumber;
				const channelMatches = node.equipment.channels.some(
					(channel) => channel.key === column.channel && channel.role === column.role,
				);
				for (const [path, valid, message] of [
					[`columns.${index}.item`, itemMatches, "The item does not match this P&ID symbol."],
					[
						`columns.${index}.channel`,
						channelMatches,
						"The channel and role do not belong to this equipment.",
					],
				] as const) {
					if (valid || [...todoPaths].some((todo) => todo.startsWith(path))) continue;
					const field = fields.find(
						(candidate) => candidate.path === path || candidate.path.startsWith(`${path}.`),
					);
					issues.push({ from: field?.value[0] ?? 0, to: field?.value[1] ?? 1, message });
				}
			}
			for (const [index, sample] of result.sidecar.experiment.samples.entries()) {
				const node = nodes.find(
					(candidate) => candidate.kind === "sample" && candidate.symbolKey === sample.symbol_key,
				);
				if (!node?.sample) continue;
				const valid =
					"id" in sample ? sample.id === node.sample.id : sample.slug === node.sample.slug;
				if (!valid) {
					const field = fields.find(
						(candidate) =>
							candidate.path === `experiment.samples.${index}.id` ||
							candidate.path === `experiment.samples.${index}.slug`,
					);
					if (field && !todoPaths.has(field.path))
						issues.push({
							from: field.value[0],
							to: field.value[1],
							message: "The sample does not match this P&ID symbol.",
						});
				}
			}
		}
	}

	function contextAt(position: number) {
		const field = fields.find(
			(candidate) => position >= candidate.key[0] && position <= candidate.key[1],
		);
		if (field) return { kind: "key" as const, path: field.path, range: field.key };
		const value = fields.find(
			(candidate) => position >= candidate.value[0] && position <= candidate.value[1],
		);
		if (value) return { kind: "value" as const, path: value.path, range: value.value };
		const start = source.lastIndexOf("\n", position - 1) + 1;
		const line = source.slice(start, position);
		if (/^\s*[\w.]*$/.test(line)) {
			const parent = tables.filter((candidate) => candidate.from < position).at(-1)?.path ?? "";
			const key = line.trim();
			return {
				kind: "key" as const,
				path: parent ? `${parent}.${key}` : key,
				range: [position - key.length, position] as [number, number],
			};
		}
		return null;
	}
	function rangeForPath(path: string): [number, number] | undefined {
		const field = fields.find((candidate) => candidate.path === path);
		if (field) return field.value[1] > field.value[0] ? field.value : field.key;
		const table = tables.find((candidate) => candidate.path === path);
		return table ? [table.from, table.from] : undefined;
	}
	function suggestions(position: number) {
		const context = contextAt(position);
		if (!context) return null;
		if (context.kind === "key") {
			const parent = context.path.split(".").slice(0, -1).join(".");
			const current = context.path.split(".").at(-1) ?? "";
			const dottedItem =
				/^columns\.\d+\.item$/.test(parent) &&
				source.slice(context.range[0], context.range[1]).startsWith("item.");
			const used = new Set(
				fields
					.filter((field) => field.path.startsWith(`${parent}.`))
					.map((field) => field.path.slice(parent.length + 1)),
			);
			const existing = source.slice(context.range[1]).trimStart().startsWith("=");
			const options = allowedTomlKeys(parent)
				.filter((key) => key === current || !used.has(key))
				.map((key) => {
					const label = dottedItem ? `item.${key}` : key;
					return { label, apply: existing ? label : `${label} = `, type: "property" };
				});
			return options.length ? { from: context.range[0], to: context.range[1], options } : null;
		}
		const key = context.path.split(".").at(-1);
		const sample = context.path.startsWith("experiment.samples.");
		const symbolPath = context.path.replace(/(?:\.item)?\.[^.]+$/, ".symbol_key");
		const symbol = references.find((reference) => reference.path === symbolPath)?.key;
		const relevant = symbol ? nodes.filter((node) => node.symbolKey === symbol) : nodes;
		const values: { label: string; apply: string; type: string }[] = [];
		let completionFrom = context.range[0];
		let completionTo = context.range[1];
		let filter: boolean | undefined;
		const add = (value: string | number) =>
			values.push({
				label: String(value),
				apply: typeof value === "number" ? String(value) : JSON.stringify(value),
				type: "constant",
			});
		if (key === "symbol_key")
			nodes
				.filter((node) => node.kind === (sample ? "sample" : "equipment"))
				.forEach((node) => add(node.symbolKey));
		else if (key === "id")
			relevant.forEach((node) => {
				const id = sample ? node.sample?.id : node.equipment?.id;
				if (id) add(id);
			});
		else if (key === "slug")
			relevant.forEach((node) => {
				const slug = sample ? node.sample?.slug : node.equipment?.slug;
				if (slug) add(slug);
			});
		else if (key === "serial_number")
			relevant.forEach((node) => {
				if (node.equipment?.serialNumber) add(node.equipment.serialNumber);
			});
		else if (key === "channel")
			relevant.forEach((node) => node.equipment?.channels.forEach((channel) => add(channel.key)));
		else if (key === "role")
			relevant.forEach((node) => node.equipment?.channels.forEach((channel) => add(channel.role)));
		else if (key === "axis") ["time", "date"].forEach(add);
		else if (key === "timezone") {
			const raw = source.slice(context.range[0], context.range[1]);
			const quote = raw[0] === '"' || raw[0] === "'" ? raw[0] : null;
			if (quote) {
				completionFrom++;
				if (raw.endsWith(quote)) completionTo--;
			}
			const typed = source.slice(completionFrom, position).toLowerCase();
			const prefix = typed === "todo" ? "" : typed;
			filter = typed === "todo" ? false : undefined;
			for (const timezone of timezones.filter((value) => value.toLowerCase().startsWith(prefix)))
				values.push({
					label: timezone,
					apply: quote ? timezone : JSON.stringify(timezone),
					type: "constant",
				});
		} else if (key === "format") {
			filter = false;
			const columnPath = context.path.match(/^(columns\.\d+)\.format$/)?.[1];
			const axisField = fields.find((field) => field.path === `${columnPath}.axis`);
			const axis = axisField
				? source.slice(axisField.value[0], axisField.value[1]).replace(/^["']|["']$/g, "")
				: "";
			const hasDateColumn = fields.some(
				(field) =>
					/^columns\.\d+\.axis$/.test(field.path) &&
					/^['"]date['"]$/.test(source.slice(field.value[0], field.value[1])),
			);
			const formats =
				axis === "date"
					? dateFormats
					: axis === "time" && hasDateColumn
						? timeFormats
						: combinedFormats;
			for (const format of formats)
				values.push({ ...format, apply: JSON.stringify(format.label), type: "constant" });
			TIMESTAMP_FORMAT_TOKENS.filter((token) => axis !== "date" || token.axis === "date")
				.filter((token) => axis !== "time" || !hasDateColumn || token.axis === "time")
				.forEach((token) => add(token.label));
		} else if (key === "skip") values.push({ label: "true", apply: "true", type: "constant" });
		else if (key === "decimal_separator") [".", ","].forEach(add);
		else if (key === "column_delimiter") [",", ";", "tab"].forEach(add);
		else if (key === "file_encoding") add("UTF-8");
		return values.length
			? {
					from: completionFrom,
					to: completionTo,
					options: values,
					filter,
				}
			: null;
	}
	return { issues, todos, references, contextAt, rangeForPath, suggestions };
}

function allowedTomlKeys(parent: string): string[] {
	if (parent === "file_structure")
		return ["column_delimiter", "decimal_separator", "header_rows", "data_row", "file_encoding"];
	if (parent === "experiment") return ["operator_email", "samples"];
	if (/^experiment\.samples\.\d+$/.test(parent)) return ["symbol_key", "id", "slug"];
	if (/^columns\.\d+\.item$/.test(parent)) return ["id", "slug", "serial_number"];
	if (/^columns\.\d+$/.test(parent))
		return [
			"name",
			"axis",
			"format",
			"timezone",
			"skip",
			"symbol_key",
			"channel",
			"role",
			"unit",
			"item.id",
			"item.slug",
			"item.serial_number",
		];
	return [];
}
