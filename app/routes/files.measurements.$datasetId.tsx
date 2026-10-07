import { asc, eq } from "drizzle-orm";
import { parquetReadObjects } from "hyparquet";
import { Link } from "react-router";

import { services } from "~/app/.server/context.ts";
import type { BreadcrumbHandle } from "~/app/components/PageBreadcrumbs.tsx";
import { TimeSeriesChart } from "~/app/components/TimeSeriesChart.tsx";
import { measurementCharts } from "~/app/lib/measurementCharts.ts";
import type { MeasurementSidecar } from "~/app/lib/measurementSidecar.ts";
import type { MeasurementSummary } from "~/app/lib/measurementSummary.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { MeasurementColumn } from "~/drizzle/schema/MeasurementColumn.ts";
import { MeasurementDataset } from "~/drizzle/schema/MeasurementDataset.ts";
import { MeasurementSample } from "~/drizzle/schema/MeasurementSample.ts";
import { OriginalFile } from "~/drizzle/schema/OriginalFile.ts";
import { parseId53 } from "~/lib/id53/parseId53.ts";
import { FileNotFoundError } from "~/lib/storage-engine/FileNotFoundError.ts";
import { StorageEngine } from "~/lib/storage-engine/StorageEngine.ts";

import type { Route } from "./+types/files.measurements.$datasetId.ts";

export const handle = { breadcrumb: "Measurements" } satisfies BreadcrumbHandle;

const PAGE_SIZE = 200;

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

export async function loader({ context, params, request }: Route.LoaderArgs) {
	const id = parseId53(params.datasetId);
	if (id === undefined) throw new Response("Measurement not found.", { status: 404 });
	const container = context.get(services);
	const db = container.get(ApplicationDatabase);
	const record = await db
		.select({ dataset: MeasurementDataset, csvName: OriginalFile.originalName })
		.from(MeasurementDataset)
		.innerJoin(OriginalFile, eq(OriginalFile.id, MeasurementDataset.csvFileId))
		.where(eq(MeasurementDataset.id, id))
		.get();
	if (!record) throw new Response("Measurement not found.", { status: 404 });
	const dataset = record.dataset;
	const columns = await db
		.select()
		.from(MeasurementColumn)
		.where(eq(MeasurementColumn.datasetId, id))
		.orderBy(asc(MeasurementColumn.position))
		.all();
	const rig = await db
		.select({ slug: InventoryEntry.slug, name: InventoryEntry.name })
		.from(InventoryEntry)
		.where(eq(InventoryEntry.id, dataset.rigId))
		.get();
	const sidecarFile = await db
		.select({ name: OriginalFile.originalName })
		.from(OriginalFile)
		.where(eq(OriginalFile.id, dataset.sidecarFileId))
		.get();
	const samples = await db
		.select()
		.from(MeasurementSample)
		.where(eq(MeasurementSample.datasetId, id))
		.orderBy(asc(MeasurementSample.position))
		.all();
	const sidecar = JSON.parse(dataset.sidecarSnapshot) as MeasurementSidecar;
	const timeZone =
		sidecar.columns.find((column) => "axis" in column && column.axis === "time")?.timezone ?? "UTC";
	const analysis = dataset.analysisSnapshot
		? (JSON.parse(dataset.analysisSnapshot) as MeasurementSummary)
		: null;
	const url = new URL(request.url);
	const page = Number(url.searchParams.get("page") ?? "1");
	const pageCount = Math.max(1, Math.ceil(dataset.rowCount / PAGE_SIZE));
	if (!Number.isSafeInteger(page) || page < 1 || page > pageCount)
		throw new Response("Page not found.", { status: 404 });
	const storage = container.get(StorageEngine);
	let rows: Record<string, unknown>[];
	try {
		const byteLength = await storage.size(dataset.dataPath);
		rows = await parquetReadObjects({
			file: {
				byteLength,
				slice: async (start: number, end?: number) =>
					new Response(
						await storage.read(dataset.dataPath, {
							start,
							length: end === undefined ? undefined : end - start,
						}),
					).arrayBuffer(),
			},
			rowStart: (page - 1) * PAGE_SIZE,
			rowEnd: Math.min(page * PAGE_SIZE, dataset.rowCount),
		});
	} catch (error) {
		if (error instanceof FileNotFoundError)
			throw new Response("Measurement data not found.", { status: 404 });
		throw error;
	}
	return {
		dataset: {
			...dataset,
			csvName: record.csvName,
			importedAt: dataset.metadataCreationTimestamp.toISOString(),
			startTime: dataset.startTime?.toISOString() ?? null,
			endTime: dataset.endTime?.toISOString() ?? null,
		},
		columns,
		rig,
		rows: rows.map((row) =>
			columns.map((column) => {
				const value = row[column.fieldName];
				return value instanceof Date
					? value.toISOString()
					: value === null || value === undefined
						? null
						: typeof value === "string" || typeof value === "number" || typeof value === "boolean"
							? String(value)
							: JSON.stringify(value);
			}),
		),
		analysis,
		timeZone,
		samples: samples.map((sample) => ({
			id: String(sample.sampleId),
			sampleName: sample.sampleName,
			sampleBatchName: sample.sampleBatchName,
			pidNodeId: sample.pidNodeId,
			anchorNodeId: sample.anchorNodeId,
			inletNodeIds: sample.inletNodeIds,
			outletNodeIds: sample.outletNodeIds,
		})),
		sidecarName: sidecarFile?.name ?? "Sidecar TOML",
		page,
		pageCount,
		rowStart: (page - 1) * PAGE_SIZE,
	};
}

export default function FilesMeasurementsDatasetId({ loaderData }: Route.ComponentProps) {
	const { dataset, columns, rig, rows, page, pageCount, samples, analysis, timeZone, rowStart } =
		loaderData;
	const base = `/files/measurements/${dataset.id}`;
	const chartColumns = columns.map((column) => ({
		id: String(column.id),
		position: column.position,
		displayName: column.name,
		parquetType: column.parquetType,
		unit: column.unit,
		inventoryEntryId: column.inventoryEntryId,
		inventoryName: column.inventoryName,
		channelKey: column.channelKey,
		channelRole: column.channelRole,
		quantityKindId: column.quantityKindId,
		gasName: column.gasName,
		pidNodeId: column.pidNodeId,
	}));
	const overviewRows = analysis
		? analysis.overview.map((point) =>
				columns.map((column, position) =>
					column.parquetType === "TIMESTAMP"
						? point.time
						: (point.values[position]?.toString() ?? null),
				),
			)
		: rows;
	const sampleCharts = measurementCharts(chartColumns, samples, overviewRows);
	const hasChartData = sampleCharts.some((sample) =>
		sample.sections.some((section) => section.charts.length > 0),
	);
	const dateTime = new Intl.DateTimeFormat("en", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone,
	});
	const formatTime = (value: string | null) =>
		value ? dateTime.format(new Date(value)) : "Unknown";
	const tableTime = new Intl.DateTimeFormat("sv-SE", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
		timeZone,
	});
	return (
		<div className="space-y-8">
			<div>
				<Link to="/files" className="text-sm text-foreground-muted hover:underline">
					All measurements
				</Link>
				<h1 className="mt-3 text-2xl font-semibold">{dataset.csvName}</h1>
			</div>
			<section className="space-y-2 rounded-xl border border-border bg-surface p-4 text-sm">
				<p>
					{dataset.rowCount.toLocaleString()} rows · Operator {dataset.operatorEmail} · Rig{" "}
					{rig ? (
						<Link className="underline" to={`/inventory/${rig.slug}`}>
							{rig.name}
						</Link>
					) : (
						"Unknown"
					)}
				</p>
				<p className="text-foreground-muted">
					Recorded {formatTime(dataset.startTime)} to {formatTime(dataset.endTime)} {timeZone}
				</p>
				<p className="text-foreground-muted">
					Imported {formatTime(dataset.importedAt)} {timeZone}
				</p>
				<div className="flex flex-wrap gap-4 underline">
					<a href={`/files/originals/${dataset.csvFileId}`}>Source CSV</a>
					<a href={`/files/originals/${dataset.sidecarFileId}`}>{loaderData.sidecarName}</a>
					<a href={`/files/datasets/${dataset.id}.parquet`}>Download Parquet</a>
				</div>
			</section>
			<section className="space-y-6">
				<h2 className="text-lg font-semibold">Trends</h2>
				<p className="text-sm text-foreground-muted">
					{analysis
						? `Overview of all ${dataset.rowCount.toLocaleString()} rows. Each interval retains its first and last row and channel extremes.`
						: `Showing rows ${(rowStart + 1).toLocaleString()}–${(rowStart + rows.length).toLocaleString()} of ${dataset.rowCount.toLocaleString()}.`}{" "}
					Solid lines show measurements. Dashed lines show setpoints. Times use {timeZone}.
				</p>
				{hasChartData ? (
					sampleCharts.map((sample) => (
						<div key={sample.id} className="space-y-5">
							<h3 className="border-b border-border pb-2 font-semibold">
								{sample.name === "Unassigned" ? "Channels without a sample" : sample.name}
							</h3>
							{sample.sections
								.filter((section) => section.charts.length > 0)
								.map((section) => (
									<div key={section.name} className="space-y-3">
										<h4 className="font-medium">{section.name}</h4>
										<div
											className={
												section.charts.length > 1 ? "grid gap-4 xl:grid-cols-2" : "grid gap-4"
											}
										>
											{section.charts.map((chart) => (
												<TimeSeriesChart
													key={chart.id}
													label={chart.label}
													unit={chart.unit}
													series={chart.series}
													timeZone={timeZone}
													headingLevel="h5"
												/>
											))}
										</div>
									</div>
								))}
						</div>
					))
				) : (
					<p className="text-sm text-foreground-muted">No numeric measurements are available.</p>
				)}
			</section>
			{analysis ? (
				<section className="space-y-3">
					<h2 className="text-lg font-semibold">Data quality</h2>
					<p className="text-sm text-foreground-muted">
						{analysis.nonIncreasingTimeSteps.toLocaleString()} repeated or backward time steps
						{analysis.largestTimeStepMs === null
							? "."
							: ` · Longest forward interval: ${(analysis.largestTimeStepMs / 1000).toLocaleString()} s.`}
					</p>
					<div className="overflow-auto rounded-xl border border-border">
						<table className="min-w-full text-left text-sm">
							<thead>
								<tr>
									<th className="px-3 py-2">Channel</th>
									<th className="px-3 py-2">Missing</th>
									<th className="px-3 py-2">Minimum</th>
									<th className="px-3 py-2">Maximum</th>
								</tr>
							</thead>
							<tbody>
								{columns.flatMap((column, position) => {
									const quality = analysis.columns[position];
									return column.parquetType === "DOUBLE" && quality
										? [
												<tr key={column.id} className="border-t border-border">
													<th className="px-3 py-2 font-medium">
														{column.name}
														{column.unit ? ` (${column.unit})` : ""}
													</th>
													<td className="px-3 py-2">{quality.missing.toLocaleString()}</td>
													<td className="px-3 py-2">{quality.minimum?.toLocaleString() ?? "—"}</td>
													<td className="px-3 py-2">{quality.maximum?.toLocaleString() ?? "—"}</td>
												</tr>,
											]
										: [];
								})}
							</tbody>
						</table>
					</div>
				</section>
			) : null}
			<section className="space-y-3">
				<h2 className="text-lg font-semibold">Data table</h2>
				<p className="text-sm text-foreground-muted">
					Rows {(rowStart + 1).toLocaleString()}–{(rowStart + rows.length).toLocaleString()} of{" "}
					{dataset.rowCount.toLocaleString()}.
				</p>
				<div className="overflow-auto rounded-xl border border-border">
					<table className="min-w-full whitespace-nowrap text-left text-sm">
						<thead>
							<tr>
								<th className="border-b border-border px-3 py-2" scope="col">
									Row
								</th>
								{columns.map((column) => (
									<th className="border-b border-border px-3 py-2" key={column.id} scope="col">
										{column.name}
										{column.unit ? ` (${column.unit})` : ""}
										{column.parquetType === "TIMESTAMP" ? ` (${timeZone})` : ""}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{rows.map((row, index) => (
								<tr key={rowStart + index}>
									<th
										className="border-b border-border px-3 py-2 font-normal text-foreground-muted"
										scope="row"
									>
										{(rowStart + index + 1).toLocaleString()}
									</th>
									{row.map((cell, column) => (
										<td className="border-b border-border px-3 py-2" key={column}>
											{cell === null
												? "—"
												: columns[column]?.parquetType === "TIMESTAMP"
													? tableTime.format(new Date(cell))
													: cell}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<nav aria-label="Data pages" className="flex items-center justify-between text-sm">
					<span>
						Page {page} of {pageCount}
					</span>
					<span className="flex gap-3">
						{page > 1 ? <Link to={`${base}?page=${page - 1}`}>Previous</Link> : null}
						{page < pageCount ? <Link to={`${base}?page=${page + 1}`}>Next</Link> : null}
					</span>
				</nav>
			</section>
		</div>
	);
}
