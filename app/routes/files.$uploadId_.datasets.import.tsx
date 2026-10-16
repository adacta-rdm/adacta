import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { ByteWriter, parquetWriteRows, type Writer } from "hyparquet-writer";
import {
	Link,
	data,
	redirect,
	useFetcher,
	useLocation,
	useNavigate,
	useRouteLoaderData,
} from "react-router";

import { services } from "~/app/.server/context.ts";
import {
	DatasetMappingPreview,
	type DatasetMappingRig,
} from "~/app/components/DatasetMappingPreview.tsx";
import type { BreadcrumbHandle } from "~/app/components/PageBreadcrumbs.tsx";
import { TomlCode } from "~/app/components/TomlCode.tsx";
import type { LeftSidebarHandle } from "~/app/layout/routeSidebar.ts";
import type { PIDGraph, PIDLength, PIDLengthUnit } from "~/app/lib/PID.ts";
import { traceGas, traceSamples } from "~/app/lib/PIDTrace.ts";
import { DatasetCsvError, parseDatasetCsv } from "~/app/lib/datasetCsv.ts";
import {
	delimiterCharacter,
	hasChannelMapping,
	normalizeSkippedSourceRow,
	parseDatasetNumber,
	parseDatasetSidecar,
	readCsvSidecarPreview,
	SIDECAR_READ_LIMIT,
	type DatasetSidecar,
	type SidecarChannelMapping,
} from "~/app/lib/datasetSidecar.ts";
import { DatasetSummaryBuilder } from "~/app/lib/datasetSummary.ts";
import { parseDatasetTimestamp } from "~/app/lib/datasetTimestamp.ts";
import { parseCsvPreview, readTextPreview } from "~/app/lib/textPreview.ts";
import { UploadedFilesSidebar } from "~/app/route-components/ImportFilesSidebar.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import { UploadManager, UploadNotFoundError } from "~/app/services/UploadManager.ts";
import { Select } from "~/catalyst-ui/select.tsx";
import { User } from "~/drizzle/schema/BetterAuth.ts";
import { Channel } from "~/drizzle/schema/Channel.ts";
import { Dataset } from "~/drizzle/schema/Dataset.ts";
import { DatasetColumn } from "~/drizzle/schema/DatasetColumn.ts";
import { DatasetSample } from "~/drizzle/schema/DatasetSample.ts";
import { Equipment } from "~/drizzle/schema/Equipment.ts";
import { Id } from "~/drizzle/schema/Id.ts";
import { PIDEdge } from "~/drizzle/schema/PIDEdge.ts";
import { PIDNode } from "~/drizzle/schema/PIDNode.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { Rig } from "~/drizzle/schema/Rig.ts";
import { Sample } from "~/drizzle/schema/Sample.ts";
import { SampleBatch } from "~/drizzle/schema/SampleBatch.ts";
import { id53 } from "~/lib/id53/id53.ts";
import { parseId53 } from "~/lib/id53/parseId53.ts";
import { FileNotFoundError } from "~/lib/storage-engine/FileNotFoundError.ts";
import { StorageEngine } from "~/lib/storage-engine/StorageEngine.ts";

import type { Route } from "./+types/files.$uploadId_.datasets.import.ts";

export const handle = {
	breadcrumb: "Review dataset import",
	leftSidebar: function DatasetImportFilesSidebar() {
		const data = useRouteLoaderData<typeof loader>("routes/files.$uploadId_.datasets.import");
		const location = useLocation();
		if (!data) return null;

		const selected = selectedPreview(location.search);
		const previewHref = (kind: "csv" | "sidecar") => {
			const search = new URLSearchParams(location.search);
			search.set("preview", kind);
			return `${location.pathname}?${search}`;
		};

		return (
			<UploadedFilesSidebar
				files={[
					{ name: data.csvName, href: previewHref("csv"), current: selected === "csv" },
					{
						name: data.sidecarName,
						href: previewHref("sidecar"),
						current: selected === "sidecar",
					},
				]}
			/>
		);
	},
} satisfies BreadcrumbHandle & LeftSidebarHandle;

function selectedPreview(search: string): "csv" | "sidecar" {
	return new URLSearchParams(search).get("preview") === "sidecar" ? "sidecar" : "csv";
}

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

export function meta() {
	return [{ title: "Import dataset — Adacta" }];
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
	const uploadId = parseId53(params.uploadId);
	if (uploadId === undefined) throw new Response("Upload not found.", { status: 404 });
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
	const csvFile = csv[0]!;
	const sidecarFile = toml[0]!;
	const [csvBytes, sidecarBytes] = await Promise.all([
		readPrefix(await (await uploads.getFile(csvFile.id)).read(), SIDECAR_READ_LIMIT),
		readPrefix(await (await uploads.getFile(sidecarFile.id)).read(), SIDECAR_READ_LIMIT),
	]);
	const csvProbe = probe(csvFile, csvBytes);
	const sidecarProbe = probe(sidecarFile, sidecarBytes);
	const csvTextPreview = await readTextPreview(csvProbe);
	const csvRawPreview = parseCsvPreview(csvTextPreview);
	const sidecarTextPreview = await readTextPreview(sidecarProbe);
	if (sidecarFile.byteSize > SIDECAR_READ_LIMIT)
		return {
			uploadId,
			csvName: csvFile.originalName,
			sidecarName: sidecarFile.originalName,
			csvRawPreview,
			sidecarTextPreview,
			rigs: [],
			selectedRigId: null,
			sidecar: null,
			sidecarIssues: [{ path: "toml", message: "The sidecar exceeds the 256 KB limit." }],
			preview: null,
			rigPreview: null,
		};
	const sidecarResult = await readSidecar(sidecarProbe);
	const sidecar = "sidecar" in sidecarResult ? sidecarResult.sidecar : undefined;
	const rigs = await db
		.select({ id: Rig.id, slug: Rig.slug, name: Rig.name })
		.from(Rig)
		.where(and(isNull(Rig.metadataArchivedAt)))
		.orderBy(asc(Rig.name))
		.all();
	const search = new URL(request.url).searchParams;
	const contextRigSlug =
		search.get("contextKind") === "inventory-entry" ? search.get("contextSlug") : null;
	const selectedRigSlug = search.has("rigSlug") ? search.get("rigSlug") : contextRigSlug;
	const selectedRig = rigs.find((rig) => rig.slug === selectedRigSlug);
	const selectedRigId = selectedRig?.id ?? null;
	let preview: Awaited<ReturnType<typeof readCsvSidecarPreview>> | null = null;
	if (sidecar) preview = await readCsvSidecarPreview(csvProbe, sidecar);
	return {
		uploadId,
		csvName: csvFile.originalName,
		sidecarName: sidecarFile.originalName,
		csvRawPreview,
		sidecarTextPreview,
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
				.select({ id: Rig.id })
				.from(Rig)
				.where(
					and(
						eq(Rig.id, rigId),

						isNull(Rig.metadataArchivedAt),
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
	if (toml[0]!.byteSize > SIDECAR_READ_LIMIT)
		return data({ error: "The sidecar exceeds the 256 KB limit." }, { status: 422 });
	const previous = await db
		.select({ id: Dataset.id, rigId: Dataset.rigId })
		.from(Dataset)
		.where(and(eq(Dataset.csvFileId, csv[0]!.id), eq(Dataset.sidecarFileId, toml[0]!.id)))
		.get();
	if (previous) {
		if (previous.rigId !== rig.id)
			return data({ error: "These files were already imported for another rig." }, { status: 422 });
		return redirect(`/files/datasets/${previous.id}`, 303);
	}
	try {
		const sidecarBytes = await readPrefix(
			await (await container.get(UploadManager).getFile(toml[0]!.id)).read(),
			SIDECAR_READ_LIMIT,
		);
		const text = new TextDecoder("utf-8", { fatal: true }).decode(sidecarBytes);
		const parsed = parseDatasetSidecar(text);
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
		return redirect(`/files/datasets/${created}`, 303);
	} catch (error) {
		if (error instanceof ImportError) return data({ error: error.message }, { status: 422 });
		if (error instanceof FileNotFoundError || error instanceof UploadNotFoundError)
			throw new Response("Upload not found.", { status: 404 });
		throw error;
	}
}

export default function FilesUploadIdDatasetsImport({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const location = useLocation();
	const navigate = useNavigate();
	const fetcher = useFetcher<typeof action>();
	const selectedFile = selectedPreview(location.search);
	const importing = fetcher.state !== "idle";
	const importError = fetcher.data?.error ?? actionData?.error;
	const blockedReason = loaderData.sidecarIssues.length
		? "Review the TOML sidecar issues before importing."
		: !loaderData.preview
			? "The CSV preview is unavailable. Check that the upload contains a readable CSV."
			: loaderData.preview.issues.length > 0
				? "Fix the CSV issues in the preview before importing."
				: undefined;
	return (
		<div className="mx-auto w-full max-w-6xl space-y-8">
			<div>
				<Link
					to={`/files/${loaderData.uploadId}${location.search}`}
					className="text-sm text-foreground-muted hover:underline"
				>
					Back to uploaded files
				</Link>
				<h1 className="mt-3 text-2xl font-semibold">Review dataset import</h1>
			</div>
			<div className="max-w-xl rounded-xl border border-border bg-surface p-5">
				<label className="block text-sm font-medium">
					Rig
					<Select
						className="mt-2"
						value={loaderData.selectedRigId ?? ""}
						onChange={(event) => {
							const rig = loaderData.rigs.find(
								(candidate) => candidate.id === Number(event.currentTarget.value),
							);
							const search = new URLSearchParams(location.search);
							search.set("rigSlug", rig?.slug ?? "");
							void navigate(`${location.pathname}?${search}`, { preventScrollReset: true });
						}}
					>
						<option value="">Select a rig…</option>
						{loaderData.rigs.map((rig) => (
							<option key={rig.id} value={rig.id}>
								{rig.name}
							</option>
						))}
					</Select>
					{loaderData.rigs.length === 0 ? (
						<span className="mt-2 block text-sm text-danger">
							No active rigs are available for this import.
						</span>
					) : !loaderData.selectedRigId ? (
						<span className="mt-2 block text-sm text-foreground-muted">
							Select the rig associated with this dataset before importing.
						</span>
					) : null}
				</label>
			</div>
			<section className="rounded-xl border border-border bg-surface p-4">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="min-w-0">
						<h2 className="font-semibold">
							{selectedFile === "csv" ? "CSV preview" : "TOML sidecar preview"}
						</h2>
						<p className="mt-1 truncate text-sm text-foreground-muted">
							{selectedFile === "csv" ? loaderData.csvName : loaderData.sidecarName}
						</p>
					</div>
					<fetcher.Form method="post" action={`${location.pathname}${location.search}`}>
						<input type="hidden" name="rigId" value={loaderData.selectedRigId ?? ""} />
						<button
							type="submit"
							disabled={importing}
							className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
						>
							{importing ? "Importing dataset…" : "Import dataset"}
						</button>
					</fetcher.Form>
				</div>
				{importError ? (
					<p role="alert" className="mt-3 text-sm text-danger">
						{importError}
					</p>
				) : null}
				{blockedReason ? (
					<p className="mt-3 text-sm text-danger">
						{blockedReason} You can still submit; the importer will return the specific error.
					</p>
				) : importing ? (
					<p role="status" className="mt-3 text-sm text-foreground-muted">
						The CSV is being validated and converted. Large files may take a little while.
					</p>
				) : null}
				{selectedFile === "csv" ? (
					<CsvDatasetPreview loaderData={loaderData} />
				) : (
					<SidecarTextPreview loaderData={loaderData} />
				)}
			</section>
		</div>
	);
}

type ImportReviewData = Awaited<ReturnType<typeof loader>>;

function CsvDatasetPreview({ loaderData }: { loaderData: ImportReviewData }) {
	const preview = loaderData.preview;
	if (!preview) {
		return (
			<div className="mt-4 overflow-auto" aria-label="CSV preview">
				<p className="mb-3 text-sm text-foreground-muted">
					The CSV is shown without the sidecar's column definitions.
				</p>
				{loaderData.csvRawPreview.rows.length === 0 ? (
					<p className="text-sm text-foreground-muted">No CSV rows were available to preview.</p>
				) : (
					<table className="min-w-full text-left text-sm">
						<tbody>
							{loaderData.csvRawPreview.rows.map((row, i) => (
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
				)}
				{loaderData.csvRawPreview.truncated ? (
					<p className="mt-3 text-xs text-foreground-muted">The CSV preview is truncated.</p>
				) : null}
			</div>
		);
	}

	return (
		<div className="mt-4 overflow-auto" aria-label="CSV preview">
			{preview.issues.map((issue, i) => (
				<p role="alert" className="mt-2 text-sm text-danger" key={i}>
					{issue.path}: {issue.message}
				</p>
			))}
			{loaderData.sidecar && loaderData.rigPreview ? (
				<div className="mt-4 overflow-hidden rounded-xl border border-border">
					<DatasetMappingPreview
						key={loaderData.rigPreview.id}
						sidecar={loaderData.sidecar}
						csv={preview}
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
						{preview.columns.map((column, i) => (
							<th scope="col" className="border-b border-border px-2 py-2" key={`${column}-${i}`}>
								{column}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{preview.rows.map((row, i) => (
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
		</div>
	);
}

function SidecarTextPreview({ loaderData }: { loaderData: ImportReviewData }) {
	return (
		<div className="mt-4" aria-label="TOML sidecar preview">
			{loaderData.sidecarIssues.length ? (
				<ul className="list-disc space-y-1 rounded-lg border border-danger p-4 pl-8 text-sm text-danger">
					{loaderData.sidecarIssues.map((issue, i) => (
						<li key={i}>
							{issue.path}: {issue.message}
						</li>
					))}
				</ul>
			) : null}
			<pre className="mt-4 max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-surface-muted p-4 font-mono text-sm text-foreground">
				{loaderData.sidecarTextPreview.text ? (
					<TomlCode text={loaderData.sidecarTextPreview.text} />
				) : (
					"The sidecar preview is empty."
				)}
			</pre>
			{loaderData.sidecarTextPreview.truncated ? (
				<p className="mt-3 text-xs text-foreground-muted">The sidecar preview is truncated.</p>
			) : null}
		</div>
	);
}

class ImportError extends Error {}

async function createDataset(
	db: ApplicationDatabase,
	creatorId: string,
	uploadId: number,
	rigId: number,
	csv: { id: number; originalName: string },
	toml: { id: number; originalName: string },
	sidecar: DatasetSidecar,
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
	const summary = new DatasetSummaryBuilder(
		columns.map((column) => column.parquetType === "DOUBLE"),
		sidecar.columns.some((column) => "axis" in column && column.axis === "numeric")
			? "numeric"
			: "time",
	);
	async function* typedRows() {
		for await (const row of parseDatasetCsv(
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
			let rowAxis: Date | number | undefined;
			for (const [position, column] of sidecar.columns.entries()) {
				const cell = cells[position]!;
				const descriptor = columns[position]!;
				if ("axis" in column && column.axis === "time") {
					const dateColumn = sidecar.columns.find((item) => "axis" in item && item.axis === "date");
					const dateCell = dateColumn ? cells[sidecar.columns.indexOf(dateColumn)]! : "";
					const timestamp = parseDatasetTimestamp(
						dateColumn ? `${dateCell} ${cell}` : cell,
						dateColumn ? `${dateColumn.format} ${column.format}` : column.format,
						column.timezone,
					);
					if (!timestamp)
						throw new ImportError(
							`Row ${sourceRow}, column ${position + 1}: invalid or ambiguous timestamp.`,
						);
					output[descriptor.fieldName] = timestamp;
					rowAxis = timestamp;
					startTime = !startTime || timestamp < startTime ? timestamp : startTime;
					endTime = !endTime || timestamp > endTime ? timestamp : endTime;
				} else if ("axis" in column && column.axis === "numeric") {
					const numeric = parseDatasetNumber(cell, sidecar.file_structure.decimal_separator);
					if (numeric === undefined || numeric === null)
						throw new ImportError(
							`Row ${sourceRow}, column ${position + 1}: invalid numeric axis value.`,
						);
					output[descriptor.fieldName] = numeric;
					numericValues[position] = numeric;
					rowAxis = numeric;
				} else if (descriptor.parquetType === "DOUBLE") {
					const numeric = parseDatasetNumber(cell, sidecar.file_structure.decimal_separator);
					if (numeric === undefined)
						throw new ImportError(`Row ${sourceRow}, column ${position + 1}: invalid number.`);
					output[descriptor.fieldName] = numeric;
					numericValues[position] = numeric;
				} else
					output[descriptor.fieldName] =
						cell === "" || cell.trim().toLowerCase() === "nan" ? null : cell;
			}
			if (rowAxis !== undefined) summary.add(rowAxis, numericValues);
			rowCount++;
			yield output;
		}
		if (rowCount === 0) throw new ImportError("The CSV has no data rows.");
	}
	const output = parquetOutput();
	const stored = storage.write(dataPath, output.readable);
	void stored.catch((error: unknown) => output.abort(error).catch(() => {}));
	try {
		const axisPosition = sidecar.columns.findIndex(
			(column) => "axis" in column && (column.axis === "time" || column.axis === "numeric"),
		);
		const axisColumn = sidecar.columns[axisPosition]!;
		await parquetWriteRows({
			writer: output.writer,
			rows: typedRows(),
			rowGroupSize: 4096,
			kvMetadata: [
				{
					key: "adacta.x_axis",
					value: JSON.stringify({
						position: axisPosition,
						name: axisColumn.name,
						kind: "axis" in axisColumn ? axisColumn.axis : null,
						unit: "unit" in axisColumn ? axisColumn.unit : null,
					}),
				},
			],
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
		if (error instanceof DatasetCsvError) throw new ImportError(error.message);
		throw error;
	}
	const now = new Date();
	try {
		await db.batch([
			db.insert(Id).values({ id }),
			db.insert(Dataset).values({
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
			// Separate inserts keep each statement's parameter list small.
			...columns.map((column, position) =>
				db.insert(DatasetColumn).values({ ...column, datasetId: id, position }),
			),
			...samples.map((sample, position) =>
				db.insert(DatasetSample).values({ ...sample, datasetId: id, position }),
			),
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
	sidecar: DatasetSidecar,
	graph: PIDGraph,
) {
	const nodes = await db
		.select()
		.from(PIDNode)
		.where(and(eq(PIDNode.rigId, rigId), isNull(PIDNode.metadataArchivedAt)))
		.all();
	const output: Omit<typeof DatasetColumn.$inferInsert, "id" | "datasetId" | "position">[] = [];
	for (const [position, column] of sidecar.columns.entries()) {
		const common = {
			name: column.name,
			fieldName: `column_${position}`,
			parquetType: "STRING",
			axis: null as string | null,
			symbolKey: null as string | null,
			equipmentId: null as number | null,
			inventoryName: null as string | null,
			channelId: null as number | null,
			channelKey: null as string | null,
			channelRole: null as string | null,
			quantityKindId: null as string | null,
			gasName: null as string | null,
			unit: null as string | null,
			pidNodeId: null as string | null,
		};
		if ("skip" in column) {
			output.push({ ...common, axis: "skip" });
			continue;
		}
		if ("axis" in column) {
			const mapping = hasChannelMapping(column)
				? await resolveMappedColumn(db, rigId, nodes, graph, position, column)
				: {};
			output.push({
				...common,
				...mapping,
				axis: column.axis,
				unit: column.axis === "numeric" ? column.unit : null,
				parquetType:
					column.axis === "time" ? "TIMESTAMP" : column.axis === "numeric" ? "DOUBLE" : "STRING",
			});
			continue;
		}
		const mapping = await resolveMappedColumn(db, rigId, nodes, graph, position, column);
		output.push({
			...common,
			...mapping,
			parquetType:
				column.role === "measurement" || column.role === "setpoint" ? "DOUBLE" : "STRING",
			unit: column.unit,
		});
	}
	return output;
}

async function resolveMappedColumn(
	db: ApplicationDatabase,
	rigId: number,
	nodes: (typeof PIDNode.$inferSelect)[],
	graph: PIDGraph,
	position: number,
	column: SidecarChannelMapping & { name: string },
) {
	const item = await resolveItem(db, rigId, column);
	const node = nodes.filter((candidate) => candidate.symbolKey === column.symbol_key);
	if (node.length !== 1 || node[0]!.equipmentId !== item.id)
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
	return {
		symbolKey: column.symbol_key,
		equipmentId: item.id,
		inventoryName: item.name,
		channelId: channel.id,
		channelKey: channel.key,
		channelRole: channel.role,
		quantityKindId: channel.quantityKindId,
		gasName: traceGas(graph, nodeRecord.id).gasNames.join(", ") || null,
		pidNodeId: nodeRecord.id,
	};
}

async function resolveItem(
	db: ApplicationDatabase,
	rigId: number,
	column: SidecarChannelMapping & { name: string },
) {
	const identifier = column.item;
	const filter =
		"id" in identifier
			? eq(Equipment.id, identifier.id)
			: "slug" in identifier
				? eq(Equipment.slug, identifier.slug)
				: eq(Equipment.serialNumber, identifier.serial_number);
	const items = await db
		.select({
			id: Equipment.id,
			slug: Equipment.slug,
			name: Product.name,
			productId: Equipment.productId,
			productArchivedAt: Product.metadataArchivedAt,
		})
		.from(Equipment)
		.innerJoin(Product, eq(Product.id, Equipment.productId))
		.where(
			and(
				filter,
				isNull(Equipment.metadataArchivedAt),
				"serial_number" in identifier
					? inArray(
							Equipment.id,
							db
								.select({ id: PIDNode.equipmentId })
								.from(PIDNode)
								.where(and(eq(PIDNode.rigId, rigId), isNull(PIDNode.metadataArchivedAt))),
						)
					: undefined,
			),
		)
		.orderBy(asc(Equipment.slug))
		.all();
	if ("serial_number" in identifier && items.length > 1) {
		throw new ImportError(
			`Column ${column.name}: serial number "${identifier.serial_number}" matches several equipment units on this rig: ${items.map((item) => `${item.name} (${item.slug})`).join(", ")}. Use an id or slug.`,
		);
	}
	const item = items[0];
	if (!item || item.productArchivedAt !== null)
		throw new ImportError(
			`Column ${column.name}: the referenced equipment or catalog product is unavailable.`,
		);
	return item;
}

async function resolveSamples(
	db: ApplicationDatabase,
	rigId: number,
	sidecar: DatasetSidecar,
	graph: PIDGraph,
	sampleBatchSlug?: string,
) {
	const nodes = await db
		.select()
		.from(PIDNode)
		.where(and(eq(PIDNode.rigId, rigId), isNull(PIDNode.metadataArchivedAt)))
		.all();
	const output: Omit<typeof DatasetSample.$inferInsert, "datasetId" | "position">[] = [];
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
		return parseDatasetSidecar(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
	} catch {
		return { issues: [{ path: "toml", message: "The sidecar is not valid UTF-8." }] as const };
	}
}

async function loadRigPreview(
	db: ApplicationDatabase,
	rig: { id: number; slug: string; name: string },
): Promise<DatasetMappingRig> {
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
			equipmentId: PIDNode.equipmentId,
			sampleId: PIDNode.sampleId,
			secondaryLabel: PIDNode.secondaryLabel,
			parentId: PIDNode.parentNodeId,
			inletCount: PIDNode.inletCount,
			orientation: PIDNode.orientation,
			position: { x: PIDNode.positionX, y: PIDNode.positionY },
		})
		.from(PIDNode)
		.where(and(eq(PIDNode.rigId, rigId), isNull(PIDNode.metadataArchivedAt)))
		.orderBy(asc(PIDNode.drawingOrder))
		.all();
	const edgeRows = await db
		.select()
		.from(PIDEdge)
		.where(and(eq(PIDEdge.rigId, rigId), isNull(PIDEdge.metadataArchivedAt)))
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
