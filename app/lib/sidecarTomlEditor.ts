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
			const assignment = line.match(/^(\s*)([\w]+)(\s*=\s*)(.*)$/);
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
		if (/^\s*[\w]*$/.test(line)) {
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
	function suggestions(position: number) {
		const context = contextAt(position);
		if (!context) return null;
		if (context.kind === "key") {
			const parent = context.path.split(".").slice(0, -1).join(".");
			const current = context.path.split(".").at(-1) ?? "";
			const used = new Set(
				fields
					.filter(
						(field) =>
							field.path.startsWith(`${parent}.`) &&
							field.path.split(".").length === parent.split(".").length + 1,
					)
					.map((field) => field.path.split(".").at(-1)),
			);
			const existing = source.slice(context.range[1]).trimStart().startsWith("=");
			const options = allowedTomlKeys(parent)
				.filter((key) => key === current || !used.has(key))
				.map((label) => ({ label, apply: existing ? label : `${label} = `, type: "property" }));
			return options.length ? { from: context.range[0], to: context.range[1], options } : null;
		}
		const key = context.path.split(".").at(-1);
		const sample = context.path.startsWith("experiment.samples.");
		const symbolPath = context.path.replace(/\.[^.]+$/, ".symbol_key");
		const symbol = references.find((reference) => reference.path === symbolPath)?.key;
		const relevant = symbol ? nodes.filter((node) => node.symbolKey === symbol) : nodes;
		const values: { label: string; apply: string; type: string }[] = [];
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
		else if (key === "timezone") timezones.forEach(add);
		else if (key === "format") TIMESTAMP_FORMAT_TOKENS.forEach((token) => add(token.label));
		else if (key === "skip") values.push({ label: "true", apply: "true", type: "constant" });
		else if (key === "decimal_separator") [".", ","].forEach(add);
		else if (key === "column_delimiter") [",", ";", "tab"].forEach(add);
		else if (key === "file_encoding") add("UTF-8");
		return values.length ? { from: context.range[0], to: context.range[1], options: values } : null;
	}
	return { issues, todos, references, contextAt, suggestions };
}

function allowedTomlKeys(parent: string): string[] {
	if (parent === "file_structure")
		return ["column_delimiter", "decimal_separator", "header_rows", "data_row", "file_encoding"];
	if (parent === "experiment") return ["operator_email", "samples"];
	if (/^experiment\.samples\.\d+$/.test(parent)) return ["symbol_key", "id", "slug"];
	if (/^columns\.\d+\.item$/.test(parent)) return ["id", "slug", "serial_number"];
	if (/^columns\.\d+$/.test(parent))
		return ["name", "axis", "format", "timezone", "skip", "symbol_key", "channel", "role", "unit"];
	return [];
}
