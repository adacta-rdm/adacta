import { and, asc, eq, isNull } from "drizzle-orm";
import { ByteWriter, parquetWriteRows, type Writer } from "hyparquet-writer";
import { Link, data, redirect, useFetcher, useLocation, useNavigate } from "react-router";

import { services } from "~/app/.server/context.ts";
import {
	MeasurementMappingPreview,
	type MeasurementMappingRig,
} from "~/app/components/MeasurementMappingPreview.tsx";
import type { BreadcrumbHandle } from "~/app/components/PageBreadcrumbs.tsx";
import type { PIDGraph, PIDLength, PIDLengthUnit } from "~/app/lib/PID.ts";
import { traceGas, traceSamples } from "~/app/lib/PIDTrace.ts";
import { MeasurementCsvError, parseMeasurementCsv } from "~/app/lib/measurementCsv.ts";
import {
	delimiterCharacter,
	normalizeSkippedSourceRow,
	parseMeasurementSidecar,
	readCsvSidecarPreview,
	SIDECAR_READ_LIMIT,
	type MeasurementSidecar,
	type SidecarChannelColumn,
} from "~/app/lib/measurementSidecar.ts";
import { MeasurementSummaryBuilder } from "~/app/lib/measurementSummary.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import { UploadManager, UploadNotFoundError } from "~/app/services/UploadManager.ts";
import { User } from "~/drizzle/schema/BetterAuth.ts";
import { Channel } from "~/drizzle/schema/Channel.ts";
import { Id } from "~/drizzle/schema/Id.ts";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { MeasurementColumn } from "~/drizzle/schema/MeasurementColumn.ts";
import { MeasurementDataset } from "~/drizzle/schema/MeasurementDataset.ts";
import { MeasurementSample } from "~/drizzle/schema/MeasurementSample.ts";
import { PIDEdge } from "~/drizzle/schema/PIDEdge.ts";
import { PIDNode } from "~/drizzle/schema/PIDNode.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { Sample } from "~/drizzle/schema/Sample.ts";
import { SampleBatch } from "~/drizzle/schema/SampleBatch.ts";
import { id53 } from "~/lib/id53/id53.ts";
import { parseId53 } from "~/lib/id53/parseId53.ts";
import { FileNotFoundError } from "~/lib/storage-engine/FileNotFoundError.ts";
import { StorageEngine } from "~/lib/storage-engine/StorageEngine.ts";

import type { Route } from "./+types/files.$uploadId_.measurements.import.ts";

export const handle = { breadcrumb: "Review measurement import" } satisfies BreadcrumbHandle;

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

export function meta() {
	return [{ title: "Import measurements — Adacta" }];
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
	const uploadId = parseId53(params.uploadId);
	if (uploadId === undefined) throw new Response("Upload not found.", { status: 404 });
	const dropParams = new URL(request.url).searchParams;
	const dropContextKind = dropParams.get("contextKind");
	const dropContextLabel = dropParams.get("contextLabel");
	const container = context.get(services);
	const db = container.get(ApplicationDatabase);
	const uploads = container.get(UploadManager);
	let files: Awaited<ReturnType<UploadManager["filesOfUpload"]>>;
	try {
		files = await uploads.filesOfUpload(uploadId);
	} catch (error) {
		if (error instanceof UploadNotFoundError || error instanceof FileNotFoundError)
			throw new Response("Upload not found.", { status: 404 });
		throw error;
	}
	const csv = files.filter((file) => /\.csv$/i.test(file.originalName));
	const toml = files.filter((file) => /\.toml$/i.test(file.originalName));
	if (files.length !== 2 || csv.length !== 1 || toml.length !== 1)
		throw new Response("This upload is not one CSV and one TOML sidecar.", { status: 404 });
	const sidecarFile = toml[0]!;
	if (sidecarFile.byteSize > SIDECAR_READ_LIMIT)
		return {
			uploadId,
			csvName: csv[0]!.originalName,
			sidecarName: sidecarFile.originalName,
			dropContextKind,
			dropContextLabel,
			rigs: [],
			selectedRigId: null,
			sidecar: null,
			sidecarIssues: [{ path: "toml", message: "The sidecar exceeds the 256 KB limit." }],
			preview: null,
			rigPreview: null,
		};
	const sidecarBytes = await readPrefix(
		await (await uploads.getFile(sidecarFile.id)).read(),
		SIDECAR_READ_LIMIT,
	);
	const sidecarProbe = probe(sidecarFile, sidecarBytes);
	const sidecarResult = await readSidecar(sidecarProbe);
	const sidecar = "sidecar" in sidecarResult ? sidecarResult.sidecar : undefined;
	const rigs = await db
		.select({ id: InventoryEntry.id, slug: InventoryEntry.slug, name: InventoryEntry.name })
		.from(InventoryEntry)
		.where(and(eq(InventoryEntry.kind, "rig"), isNull(InventoryEntry.metadataArchivedAt)))
		.orderBy(asc(InventoryEntry.name))
		.all();
	const search = new URL(request.url).searchParams;
	const contextRigSlug =
		search.get("contextKind") === "inventory-entry" ? search.get("contextSlug") : null;
	const selectedRigSlug = search.has("rigSlug") ? search.get("rigSlug") : contextRigSlug;
	const selectedRig = rigs.find((rig) => rig.slug === selectedRigSlug);
	const selectedRigId = selectedRig?.id ?? null;
	let preview: Awaited<ReturnType<typeof readCsvSidecarPreview>> | null = null;
	if (sidecar) {
		const csvFile = csv[0]!;
		const csvBytes = await readPrefix(
			await (await uploads.getFile(csvFile.id)).read(),
			SIDECAR_READ_LIMIT,
		);
		preview = await readCsvSidecarPreview(probe(csvFile, csvBytes), sidecar);
	}
	return {
		uploadId,
		csvName: csv[0]!.originalName,
		sidecarName: sidecarFile.originalName,
		dropContextKind,
		dropContextLabel,
		rigs,
		selectedRigId,
		sidecar: sidecar ?? null,
		sidecarIssues: sidecarResult.issues,
		preview,
		rigPreview: sidecar && selectedRig ? await loadRigPreview(db, selectedRig) : null,
	};
}

export async function action({ context, request, params }: Route.ActionArgs) {
	const uploadId = parseId53(params.uploadId);
	if (uploadId === undefined) throw new Response("Upload not found.", { status: 404 });
	const form = await request.formData();
	const rigId = Number(form.get("rigId"));
	const container = context.get(services);
	const db = container.get(ApplicationDatabase);
	const rig = Number.isSafeInteger(rigId)
		? await db
				.select({ id: InventoryEntry.id })
				.from(InventoryEntry)
				.where(
					and(
						eq(InventoryEntry.id, rigId),
						eq(InventoryEntry.kind, "rig"),
						isNull(InventoryEntry.metadataArchivedAt),
					),
				)
				.get()
		: undefined;
	if (!rig) return data({ error: "Select a rig for this import." }, { status: 422 });
	const files = await container.get(UploadManager).filesOfUpload(uploadId);
	const csv = files.filter((file) => /\.csv$/i.test(file.originalName));
	const toml = files.filter((file) => /\.toml$/i.test(file.originalName));
	if (files.length !== 2 || csv.length !== 1 || toml.length !== 1)
		return data({ error: "Import requires one CSV and one TOML sidecar." }, { status: 422 });
	const previous = await db
		.select({ id: MeasurementDataset.id, rigId: MeasurementDataset.rigId })
		.from(MeasurementDataset)
		.where(
			and(
				eq(MeasurementDataset.csvFileId, csv[0]!.id),
				eq(MeasurementDataset.sidecarFileId, toml[0]!.id),
			),
		)
		.get();
	if (previous) {
		if (previous.rigId !== rig.id)
			return data({ error: "These files were already imported for another rig." }, { status: 422 });
		return redirect(`/files/${uploadId}?measurement=${previous.id}${contextQuery(request)}`, 303);
	}
	try {
		const sidecarBytes = await readPrefix(
			await (await container.get(UploadManager).getFile(toml[0]!.id)).read(),
			SIDECAR_READ_LIMIT,
		);
		const text = new TextDecoder("utf-8", { fatal: true }).decode(sidecarBytes);
		const parsed = parseMeasurementSidecar(text);
		if (!parsed.sidecar)
			return data(
				{ error: parsed.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n") },
				{ status: 422 },
			);
		const sidecar = parsed.sidecar;
		const search = new URL(request.url).searchParams;
		const sampleBatchSlug =
			search.get("contextKind") === "sample-batch"
				? (search.get("contextSlug") ?? undefined)
				: undefined;
		const created = await createDataset(
			db,
			container.get(Security).userId,
			uploadId,
			rig.id,
			csv[0]!,
			toml[0]!,
			sidecar,
			await (await container.get(UploadManager).getFile(csv[0]!.id)).read(),
			container.get(StorageEngine),
			sampleBatchSlug,
		);
		return redirect(`/files/${uploadId}?measurement=${created}${contextQuery(request)}`, 303);
	} catch (error) {
		if (error instanceof ImportError) return data({ error: error.message }, { status: 422 });
		if (error instanceof FileNotFoundError || error instanceof UploadNotFoundError)
			throw new Response("Upload not found.", { status: 404 });
		throw error;
	}
}

export default function FilesUploadIdMeasurementsImport({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const location = useLocation();
	const navigate = useNavigate();
	const fetcher = useFetcher<typeof action>();
	const importing = fetcher.state !== "idle";
	const importError = fetcher.data?.error ?? actionData?.error;
	const blockedReason = loaderData.sidecarIssues.length
		? "Fix the TOML sidecar issues above before importing."
		: !loaderData.preview
			? "The CSV preview is unavailable. Check that the upload contains a readable CSV."
			: loaderData.preview.issues.length > 0
				? "Fix the CSV issues above before importing."
				: undefined;
	return (
		<div className="space-y-8">
			<div>
				<Link
					to={`/files/${loaderData.uploadId}${location.search}`}
					className="text-sm text-foreground-muted hover:underline"
				>
					Back to uploaded files
				</Link>
				<h1 className="mt-3 text-2xl font-semibold">Review measurement import</h1>
				<p className="mt-2 text-sm text-foreground-muted">
					{loaderData.csvName} with {loaderData.sidecarName}
				</p>
			</div>
			{loaderData.dropContextLabel ? (
				<p className="rounded-lg border border-border bg-surface-muted p-4 text-sm text-foreground-muted">
					Starting context:{" "}
					{loaderData.dropContextKind === "sample-batch" ? "Sample batch" : "Inventory item"}{" "}
					{loaderData.dropContextLabel}
				</p>
			) : null}
			{loaderData.sidecarIssues.length ? (
				<ul className="list-disc space-y-1 rounded-lg border border-danger p-4 pl-8 text-sm text-danger">
					{loaderData.sidecarIssues.map((issue, i) => (
						<li key={i}>
							{issue.path}: {issue.message}
						</li>
					))}
				</ul>
			) : null}
			<div className="max-w-xl rounded-xl border border-border bg-surface p-5">
				<label className="block text-sm font-medium">
					Rig
					<select
						value={loaderData.selectedRigId ?? ""}
						onChange={(event) => {
							const rig = loaderData.rigs.find(
								(candidate) => candidate.id === Number(event.currentTarget.value),
							);
							const search = new URLSearchParams(location.search);
							search.set("rigSlug", rig?.slug ?? "");
							void navigate(`${location.pathname}?${search}`, { preventScrollReset: true });
						}}
						className="mt-2 block w-full rounded-lg border border-border bg-surface px-3 py-2"
					>
						<option value="">Select a rig…</option>
						{loaderData.rigs.map((rig) => (
							<option key={rig.id} value={rig.id}>
								{rig.name}
							</option>
						))}
					</select>
					{loaderData.rigs.length === 0 ? (
						<span className="mt-2 block text-sm text-danger">
							No active rigs are available for this import.
						</span>
					) : !loaderData.selectedRigId ? (
						<span className="mt-2 block text-sm text-foreground-muted">
							Select the rig used for these measurements before importing.
						</span>
					) : null}
				</label>
			</div>
			{loaderData.preview ? (
				<section className="overflow-auto rounded-xl border border-border bg-surface p-4">
					<h2 className="font-semibold">CSV preview</h2>
					{loaderData.preview.issues.map((issue, i) => (
						<p role="alert" className="mt-2 text-sm text-danger" key={i}>
							{issue.path}: {issue.message}
						</p>
					))}
					{loaderData.sidecar && loaderData.rigPreview ? (
						<div className="mt-4 overflow-hidden rounded-xl border border-border">
							<MeasurementMappingPreview
								key={loaderData.rigPreview.id}
								sidecar={loaderData.sidecar}
								csv={loaderData.preview}
								rig={loaderData.rigPreview}
							/>
						</div>
					) : loaderData.sidecar ? (
						<p className="mt-4 text-sm text-foreground-muted">
							Select a rig to inspect how the sidecar columns map to its P&amp;ID.
						</p>
					) : null}
					<table className="mt-4 min-w-full text-left text-sm">
						<thead>
							<tr>
								{loaderData.preview.columns.map((column, i) => (
									<th className="border-b border-border px-2 py-2" key={`${column}-${i}`}>
										{column}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{loaderData.preview.rows.map((row, i) => (
								<tr key={i}>
									{row.map((cell, j) => (
										<td className="border-b border-border px-2 py-2" key={j}>
											{cell}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</section>
			) : null}
			<fetcher.Form
				method="post"
				action={`${location.pathname}${location.search}`}
				className="max-w-xl space-y-4 rounded-xl border border-border bg-surface p-5"
			>
				<input type="hidden" name="rigId" value={loaderData.selectedRigId ?? ""} />
				{importError ? (
					<p role="alert" className="text-sm text-danger">
						{importError}
					</p>
				) : null}
				<button
					type="submit"
					disabled={importing}
					className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
				>
					{importing ? "Importing measurements…" : "Import measurements"}
				</button>
				{blockedReason ? (
					<p className="text-sm text-danger">
						{blockedReason} You can still submit; the importer will return the specific error.
					</p>
				) : importing ? (
					<p role="status" className="text-sm text-foreground-muted">
						The CSV is being validated and converted. Large files may take a little while.
					</p>
				) : null}
			</fetcher.Form>
		</div>
	);
}

class ImportError extends Error {}

function contextQuery(request: Request): string {
	const search = new URL(request.url).searchParams;
	const kind = search.get("contextKind");
	const slug = search.get("contextSlug");
	const label = search.get("contextLabel");
	if (!slug || !label || (kind !== "inventory-entry" && kind !== "sample-batch")) return "";
	const query = new URLSearchParams({ contextKind: kind, contextSlug: slug, contextLabel: label });
	return `&${query}`;
}

async function createDataset(
	db: ApplicationDatabase,
	creatorId: string,
	uploadId: number,
	rigId: number,
	csv: { id: number; originalName: string },
	toml: { id: number; originalName: string },
	sidecar: MeasurementSidecar,
	csvStream: ReadableStream<Uint8Array>,
	storage: StorageEngine,
	sampleBatchSlug?: string,
) {
	const graph = await loadRigGraph(db, rigId);
	const columns = await resolveColumns(db, rigId, sidecar, graph);
	const samples = await resolveSamples(db, rigId, sidecar, graph, sampleBatchSlug);
	const headerNames = sidecar.columns.map((column) => column.name);
	const operator = await db
		.select({ id: User.id })
		.from(User)
		.where(eq(User.email, sidecar.experiment.operator_email))
		.get();
	if (!operator) throw new ImportError(`Unknown operator: ${sidecar.experiment.operator_email}`);
	const id = id53();
	const dataPath = `datasets/${id}.parquet`;
	let rowCount = 0;
	let sourceRow = 0;
	let startTime: Date | null = null;
	let endTime: Date | null = null;
	const summary = new MeasurementSummaryBuilder(
		columns.map((column) => column.parquetType === "DOUBLE"),
	);
	async function* typedRows() {
		for await (const row of parseMeasurementCsv(
			csvStream,
			delimiterCharacter(sidecar.file_structure.column_delimiter),
			csv.originalName,
		)) {
			sourceRow++;
			if (
				sidecar.file_structure.header_rows > 0 &&
				sourceRow === sidecar.file_structure.header_rows &&
				(row.length !== headerNames.length ||
					row.some((name, index) => name !== headerNames[index]))
			)
				throw new ImportError("The CSV header does not match the sidecar column order.");
			if (sourceRow < sidecar.file_structure.data_row) continue;
			const cells = normalizeSkippedSourceRow(row, sidecar.columns);
			if (cells.length !== sidecar.columns.length)
				throw new ImportError(
					`Row ${sourceRow}: expected ${sidecar.columns.length} cells, found ${cells.length}.`,
				);
			const output: Record<string, Date | number | string | null> = {};
			const numericValues: (number | null)[] = columns.map(() => null);
			let rowTime: Date | undefined;
			for (const [position, column] of sidecar.columns.entries()) {
				const cell = cells[position]!;
				const descriptor = columns[position]!;
				if ("axis" in column && column.axis === "time") {
					const dateColumn = sidecar.columns.find((item) => "axis" in item && item.axis === "date");
					const dateCell = dateColumn ? cells[sidecar.columns.indexOf(dateColumn)]! : "";
					const timestamp = parseTimestamp(
						dateColumn ? `${dateCell} ${cell}` : cell,
						dateColumn ? `${dateColumn.format} ${column.format}` : column.format,
						column.timezone,
					);
					if (!timestamp)
						throw new ImportError(
							`Row ${sourceRow}, column ${position + 1}: invalid or ambiguous timestamp.`,
						);
					output[descriptor.fieldName] = timestamp;
					rowTime = timestamp;
					startTime = !startTime || timestamp < startTime ? timestamp : startTime;
					endTime = !endTime || timestamp > endTime ? timestamp : endTime;
				} else if (descriptor.parquetType === "DOUBLE") {
					const numeric = parseNumber(cell, sidecar.file_structure.decimal_separator);
					if (numeric === undefined)
						throw new ImportError(`Row ${sourceRow}, column ${position + 1}: invalid number.`);
					output[descriptor.fieldName] = numeric;
					numericValues[position] = numeric;
				} else
					output[descriptor.fieldName] =
						cell === "" || cell.trim().toLowerCase() === "nan" ? null : cell;
			}
			if (rowTime) summary.add(rowTime, numericValues);
			rowCount++;
			yield output;
		}
		if (rowCount === 0) throw new ImportError("The CSV has no data rows.");
	}
	const output = parquetOutput();
	const stored = storage.write(dataPath, output.readable);
	void stored.catch((error: unknown) => output.abort(error).catch(() => {}));
	try {
		await parquetWriteRows({
			writer: output.writer,
			rows: typedRows(),
			rowGroupSize: 4096,
			columns: columns.map((column) => ({
				name: column.fieldName,
				type: column.parquetType as "TIMESTAMP" | "DOUBLE" | "STRING",
			})),
		});
		await stored;
	} catch (error) {
		await output.abort(error).catch(() => {});
		await stored.catch(() => {});
		await storage.remove(dataPath).catch(() => {});
		if (error instanceof MeasurementCsvError) throw new ImportError(error.message);
		throw error;
	}
	const now = new Date();
	try {
		await db.batch([
			db.insert(Id).values({ id }),
			db.insert(MeasurementDataset).values({
				id,
				rigId,
				uploadId,
				csvFileId: csv.id,
				sidecarFileId: toml.id,
				operatorId: operator.id,
				operatorEmail: sidecar.experiment.operator_email,
				rowCount,
				startTime,
				endTime,
				sidecarSnapshot: JSON.stringify(sidecar),
				analysisSnapshot: JSON.stringify(summary.finish()),
				dataPath,
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: now,
			}),
			...(columns.length
				? [
						db
							.insert(MeasurementColumn)
							.values(columns.map((column, position) => ({ ...column, datasetId: id, position }))),
					]
				: []),
			...(samples.length
				? [
						db
							.insert(MeasurementSample)
							.values(samples.map((sample, position) => ({ ...sample, datasetId: id, position }))),
					]
				: []),
		]);
	} catch (error) {
		await storage.remove(dataPath);
		throw error;
	}
	return id;
}

async function resolveColumns(
	db: ApplicationDatabase,
	rigId: number,
	sidecar: MeasurementSidecar,
	graph: PIDGraph,
) {
	const nodes = await db
		.select()
		.from(PIDNode)
		.where(and(eq(PIDNode.inventoryEntryId, rigId), isNull(PIDNode.metadataArchivedAt)))
		.all();
	const output: Omit<typeof MeasurementColumn.$inferInsert, "id" | "datasetId" | "position">[] = [];
	for (const [position, column] of sidecar.columns.entries()) {
		const common = {
			name: column.name,
			fieldName: `column_${position}`,
			parquetType: "STRING",
			axis: null as string | null,
			symbolKey: null as string | null,
			inventoryEntryId: null as number | null,
			inventoryName: null as string | null,
			channelId: null as number | null,
			channelKey: null as string | null,
			channelRole: null as string | null,
			quantityKindId: null as string | null,
			gasName: null as string | null,
			unit: null as string | null,
			pidNodeId: null as string | null,
			sourceColumn: column.name,
		};
		if ("skip" in column) {
			output.push({ ...common, axis: "skip" });
			continue;
		}
		if ("axis" in column) {
			output.push({
				...common,
				axis: column.axis,
				parquetType: column.axis === "time" ? "TIMESTAMP" : "STRING",
			});
			continue;
		}
		const item = await resolveItem(db, column);
		const node = nodes.filter((candidate) => candidate.symbolKey === column.symbol_key);
		if (node.length !== 1 || node[0]!.equipmentEntryId !== item.id)
			throw new ImportError(
				`Column ${position + 1}: symbol ${column.symbol_key} does not identify ${item.name} on this rig.`,
			);
		const channel = await db
			.select({
				id: Channel.id,
				key: Channel.key,
				role: Channel.role,
				quantityKindId: Channel.quantityKindId,
			})
			.from(Channel)
			.where(
				and(
					eq(Channel.productId, item.productId!),
					eq(Channel.key, column.channel),
					eq(Channel.role, column.role),
					isNull(Channel.metadataArchivedAt),
				),
			)
			.get();
		if (!channel)
			throw new ImportError(
				`Column ${position + 1}: channel ${column.channel} (${column.role}) does not belong to ${item.name}.`,
			);
		const nodeRecord = node[0]!;
		output.push({
			...common,
			parquetType:
				column.role === "measurement" || column.role === "setpoint" ? "DOUBLE" : "STRING",
			symbolKey: column.symbol_key,
			inventoryEntryId: item.id,
			inventoryName: item.name,
			channelId: channel.id,
			channelKey: channel.key,
			channelRole: channel.role,
			quantityKindId: channel.quantityKindId,
			gasName: traceGas(graph, nodeRecord.id).gasNames.join(", ") || null,
			pidNodeId: nodeRecord.id,
			unit: column.unit,
		});
	}
	return output;
}

async function resolveItem(db: ApplicationDatabase, column: SidecarChannelColumn) {
	const identifier = column.item;
	const filter =
		"id" in identifier
			? eq(InventoryEntry.id, identifier.id)
			: "slug" in identifier
				? eq(InventoryEntry.slug, identifier.slug)
				: eq(InventoryEntry.serialNumber, identifier.serial_number);
	const item = await db
		.select({
			id: InventoryEntry.id,
			name: InventoryEntry.name,
			kind: InventoryEntry.kind,
			productId: InventoryEntry.productId,
			productArchivedAt: Product.metadataArchivedAt,
		})
		.from(InventoryEntry)
		.leftJoin(Product, eq(Product.id, InventoryEntry.productId))
		.where(and(filter, isNull(InventoryEntry.metadataArchivedAt)))
		.get();
	if (
		!item ||
		item.kind !== "equipment" ||
		item.productId === null ||
		item.productArchivedAt !== null
	)
		throw new ImportError(
			`Column ${column.name}: the referenced equipment or catalog product is unavailable.`,
		);
	return item;
}

async function resolveSamples(
	db: ApplicationDatabase,
	rigId: number,
	sidecar: MeasurementSidecar,
	graph: PIDGraph,
	sampleBatchSlug?: string,
) {
	const nodes = await db
		.select()
		.from(PIDNode)
		.where(and(eq(PIDNode.inventoryEntryId, rigId), isNull(PIDNode.metadataArchivedAt)))
		.all();
	const output: Omit<typeof MeasurementSample.$inferInsert, "datasetId" | "position">[] = [];
	const traces = traceSamples(graph);
	const batch = sampleBatchSlug
		? await db
				.select({ id: SampleBatch.id })
				.from(SampleBatch)
				.where(and(eq(SampleBatch.slug, sampleBatchSlug), isNull(SampleBatch.metadataArchivedAt)))
				.get()
		: undefined;
	if (sampleBatchSlug && !batch)
		throw new ImportError("The sample-batch drop context is unavailable.");
	for (const entry of sidecar.experiment.samples) {
		const filter = "id" in entry ? eq(Sample.id, entry.id) : eq(Sample.slug, entry.slug);
		const filters = [
			filter,
			isNull(Sample.metadataArchivedAt),
			isNull(SampleBatch.metadataArchivedAt),
		];
		if (batch) filters.push(eq(Sample.batchId, batch.id));
		const matches = await db
			.select({ id: Sample.id, name: Sample.name, batchName: SampleBatch.name })
			.from(Sample)
			.innerJoin(SampleBatch, eq(SampleBatch.id, Sample.batchId))
			.where(and(...filters))
			.all();
		const node = nodes.find(
			(candidate) => candidate.symbolKey === entry.symbol_key && candidate.kind === "sample",
		);
		if (matches.length !== 1 || !node || node.sampleId !== matches[0]!.id)
			throw new ImportError(
				`Sample reference ${entry.symbol_key} is missing, ambiguous, or does not match a sample symbol on this rig.`,
			);
		output.push({
			sampleId: matches[0]!.id,
			sampleName: matches[0]!.name,
			sampleBatchName: matches[0]!.batchName,
			symbolKey: entry.symbol_key,
			identifier: JSON.stringify("id" in entry ? { id: entry.id } : { slug: entry.slug }),
			pidNodeId: node.id,
			anchorNodeId: traces.find((trace) => trace.sampleId === node.id)?.anchorId ?? node.id,
			inletNodeIds: traces.find((trace) => trace.sampleId === node.id)?.inletNodeIds ?? [],
			outletNodeIds: traces.find((trace) => trace.sampleId === node.id)?.outletNodeIds ?? [],
		});
	}
	return output;
}

function parseNumber(value: string, separator: "." | ","): number | null | undefined {
	if (value.trim() === "" || value.trim().toLowerCase() === "nan") return null;
	const normalized = separator === "," ? value.replace(",", ".") : value;
	if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized)) return undefined;
	const number = Number(normalized);
	return Number.isFinite(number) ? number : undefined;
}

function parseTimestamp(value: string, format: string, timezone: string): Date | undefined {
	const tokens: Record<string, string> = {
		"%Y": "(?<year>\\d{4})",
		"%m": "(?<month>\\d{1,2})",
		"%d": "(?<day>\\d{1,2})",
		"%H": "(?<hour>\\d{1,2})",
		"%M": "(?<minute>\\d{1,2})",
		"%S": "(?<second>\\d{1,2})",
		"%L": "(?<millisecond>\\d{3})",
	};
	let pattern = "";
	for (let index = 0; index < format.length; index++) {
		if (format[index] === "%") {
			const token = format.slice(index, index + 2);
			if (!tokens[token]) return undefined;
			pattern += tokens[token];
			index++;
		} else pattern += format[index]!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}
	const groups = new RegExp(`^${pattern}$`).exec(value)?.groups;
	if (!groups) return undefined;
	const parts = [
		groups.year,
		groups.month ?? "1",
		groups.day ?? "1",
		groups.hour ?? "0",
		groups.minute ?? "0",
		groups.second ?? "0",
		groups.millisecond ?? "0",
	].map(Number);
	const [year, month, day, hour, minute, second, millisecond] = parts;
	const local = Date.UTC(year!, month! - 1, day!, hour!, minute!, second!, millisecond!);
	const check = new Date(local);
	if (
		check.getUTCFullYear() !== year ||
		check.getUTCMonth() + 1 !== month ||
		check.getUTCDate() !== day ||
		check.getUTCHours() !== hour ||
		check.getUTCMinutes() !== minute ||
		check.getUTCSeconds() !== second
	)
		return undefined;
	if (timezone === "UTC" || timezone === "Etc/UTC") return check;
	let formatter: Intl.DateTimeFormat;
	try {
		formatter = new Intl.DateTimeFormat("en-GB", {
			timeZone: timezone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hourCycle: "h23",
		});
	} catch {
		return undefined;
	}
	const offsets = new Set<number>();
	for (const probe of [
		local - millisecond! - 86_400_000,
		local - millisecond!,
		local - millisecond! + 86_400_000,
	]) {
		const rendered = Object.fromEntries(
			formatter.formatToParts(new Date(probe)).map((part) => [part.type, part.value]),
		);
		offsets.add(
			(Date.UTC(
				Number(rendered.year),
				Number(rendered.month) - 1,
				Number(rendered.day),
				Number(rendered.hour),
				Number(rendered.minute),
				Number(rendered.second),
			) -
				probe) /
				60_000,
		);
	}
	const matches = [...offsets]
		.map((offset) => new Date(local - offset * 60_000))
		.filter((date) => {
			const rendered = Object.fromEntries(
				formatter.formatToParts(date).map((part) => [part.type, part.value]),
			);
			return (
				Number(rendered.year) === year &&
				Number(rendered.month) === month &&
				Number(rendered.day) === day &&
				Number(rendered.hour) === hour &&
				Number(rendered.minute) === minute &&
				Number(rendered.second) === second
			);
		});
	return matches.length === 1 ? matches[0] : undefined;
}

function parquetOutput() {
	const pipe = new TransformStream<Uint8Array, Uint8Array>();
	const sink = pipe.writable.getWriter();
	const bytes = new ByteWriter();
	const writer: Writer = bytes;
	writer.flush = async () => {
		if (bytes.index === 0) return;
		const chunk = bytes.getBytes().slice();
		bytes.index = 0;
		await sink.write(chunk);
	};
	writer.finish = async () => {
		await writer.flush?.();
		await sink.close();
	};
	return { writer, readable: pipe.readable, abort: (error: unknown) => sink.abort(error) };
}

async function readPrefix(stream: ReadableStream<Uint8Array>, limit: number): Promise<Uint8Array> {
	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	while (size < limit) {
		const { value, done } = await reader.read();
		if (done) break;
		const part = value!.subarray(0, limit - size);
		chunks.push(part);
		size += part.length;
		if (part.length < value!.length) break;
	}
	await reader.cancel().catch(() => {});
	const output = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		output.set(chunk, offset);
		offset += chunk.length;
	}
	return output;
}

function probe(
	file: { originalName: string; byteSize: number; mediaType: string | null },
	bytes: Uint8Array,
) {
	return {
		name: file.originalName,
		size: file.byteSize,
		declaredMediaType: file.mediaType ?? "",
		lastModified: 0,
		async read(start: number, length: number) {
			return bytes.slice(start, Math.min(bytes.length, start + length));
		},
	};
}

async function readSidecar(source: ReturnType<typeof probe>) {
	const bytes = await source.read(0, SIDECAR_READ_LIMIT);
	try {
		return parseMeasurementSidecar(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
	} catch {
		return { issues: [{ path: "toml", message: "The sidecar is not valid UTF-8." }] as const };
	}
}

async function loadRigPreview(
	db: ApplicationDatabase,
	rig: { id: number; slug: string; name: string },
): Promise<MeasurementMappingRig> {
	const graph = await loadRigGraph(db, rig.id);
	return {
		...rig,
		symbolKeys: graph.nodes.flatMap((node) => (node.symbolKey ? [node.symbolKey] : [])),
		graph,
	};
}

async function loadRigGraph(db: ApplicationDatabase, rigId: number): Promise<PIDGraph> {
	const nodes = await db
		.select({
			id: PIDNode.id,
			kind: PIDNode.kind,
			label: PIDNode.label,
			symbolKey: PIDNode.symbolKey,
			equipmentId: PIDNode.equipmentEntryId,
			sampleId: PIDNode.sampleId,
			secondaryLabel: PIDNode.secondaryLabel,
			parentId: PIDNode.parentNodeId,
			inletCount: PIDNode.inletCount,
			orientation: PIDNode.orientation,
			position: { x: PIDNode.positionX, y: PIDNode.positionY },
		})
		.from(PIDNode)
		.where(and(eq(PIDNode.inventoryEntryId, rigId), isNull(PIDNode.metadataArchivedAt)))
		.orderBy(asc(PIDNode.drawingOrder))
		.all();
	const edgeRows = await db
		.select()
		.from(PIDEdge)
		.where(and(eq(PIDEdge.inventoryEntryId, rigId), isNull(PIDEdge.metadataArchivedAt)))
		.orderBy(asc(PIDEdge.drawingOrder))
		.all();
	const graph = {
		nodes,
		edges: edgeRows.map((edge) => ({
			id: edge.id,
			kind: edge.kind,
			endArrow: edge.endArrow,
			arrowPositions: edge.arrowPositions,
			weight: edge.weight,
			material: edge.material,
			innerDiameter: pidLength(edge.innerDiameterValue, edge.innerDiameterUnit),
			outerDiameter: pidLength(edge.outerDiameterValue, edge.outerDiameterUnit),
			length: pidLength(edge.lengthValue, edge.lengthUnit),
			source: edge.sourceNodeId,
			target: edge.targetNodeId,
			sourceHandle: edge.sourceHandle,
			targetHandle: edge.targetHandle,
		})),
	} satisfies PIDGraph;
	return graph;
}

function pidLength(value: number | null, unit: PIDLengthUnit | null): PIDLength | null {
	return value === null || unit === null ? null : { value, unit };
}
