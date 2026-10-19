import { asc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { parquetReadObjects } from "hyparquet";
import { Link } from "react-router";

import { services } from "~/app/.server/context.ts";
import type { BreadcrumbHandle } from "~/app/components/PageBreadcrumbs.tsx";
import { TimeSeriesChart } from "~/app/components/TimeSeriesChart.tsx";
import { datasetCharts } from "~/app/lib/datasetCharts.ts";
import type { DatasetSidecar } from "~/app/lib/datasetSidecar.ts";
import type { DatasetSummary } from "~/app/lib/datasetSummary.ts";
import { inventoryEntryPath } from "~/app/lib/inventory.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Dataset } from "~/drizzle/schema/Dataset.ts";
import { DatasetColumn } from "~/drizzle/schema/DatasetColumn.ts";
import { DatasetSample } from "~/drizzle/schema/DatasetSample.ts";
import { OriginalFile } from "~/drizzle/schema/OriginalFile.ts";
import { Rig } from "~/drizzle/schema/Rig.ts";
import { parseId53 } from "~/lib/id53/parseId53.ts";
import { FileNotFoundError } from "~/lib/storage-engine/FileNotFoundError.ts";
import { StorageEngine } from "~/lib/storage-engine/StorageEngine.ts";

import type { Route } from "./+types/files.datasets.$datasetId.ts";

export const handle = { breadcrumb: "Datasets" } satisfies BreadcrumbHandle;

const PAGE_SIZE = 200;

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

export async function loader({ context, params, request }: Route.LoaderArgs) {
	const id = parseId53(params.datasetId);
	if (id === undefined) throw new Response("Dataset not found.", { status: 404 });
	const container = context.get(services);
	const db = container.get(ApplicationDatabase);
	const sidecarFile = alias(OriginalFile, "sidecarFile");
	const record = await db
		.select({
			dataset: {
				id: Dataset.id,
				csvName: OriginalFile.originalName,
				csvFileId: Dataset.csvFileId,
				sidecarFileId: Dataset.sidecarFileId,
				rowCount: Dataset.rowCount,
				operatorEmail: Dataset.operatorEmail,
				startTime: Dataset.startTime,
				endTime: Dataset.endTime,
				importedAt: Dataset.metadataCreationTimestamp,
			},
			dataPath: Dataset.dataPath,
			sidecarSnapshot: Dataset.sidecarSnapshot,
			analysisSnapshot: Dataset.analysisSnapshot,
			rig: { slug: Rig.slug, name: Rig.name },
			sidecarName: sidecarFile.originalName,
		})
		.from(Dataset)
		.innerJoin(OriginalFile, eq(OriginalFile.id, Dataset.csvFileId))
		.leftJoin(Rig, eq(Rig.id, Dataset.rigId))
		.leftJoin(sidecarFile, eq(sidecarFile.id, Dataset.sidecarFileId))
		.where(eq(Dataset.id, id))
		.get();
	if (!record) throw new Response("Dataset not found.", { status: 404 });
	const dataset = record.dataset;
	const columns = await db
		.select({
			id: sql<string>`cast(${DatasetColumn.id} as text)`,
			position: DatasetColumn.position,
			displayName: DatasetColumn.name,
			fieldName: DatasetColumn.fieldName,
			parquetType: DatasetColumn.parquetType,
			axis: DatasetColumn.axis,
			unit: DatasetColumn.unit,
			equipmentId: DatasetColumn.equipmentId,
			inventoryName: DatasetColumn.inventoryName,
			channelKey: DatasetColumn.channelKey,
			channelRole: DatasetColumn.channelRole,
			quantityKindId: DatasetColumn.quantityKindId,
			gasName: DatasetColumn.gasName,
			pidNodeId: DatasetColumn.pidNodeId,
		})
		.from(DatasetColumn)
		.where(eq(DatasetColumn.datasetId, id))
		.orderBy(asc(DatasetColumn.position))
		.all();
	const samples = await db
		.select({
			id: sql<string>`cast(${DatasetSample.sampleId} as text)`,
			sampleName: DatasetSample.sampleName,
			sampleBatchName: DatasetSample.sampleBatchName,
			pidNodeId: DatasetSample.pidNodeId,
			anchorNodeId: DatasetSample.anchorNodeId,
			inletNodeIds: DatasetSample.inletNodeIds,
			outletNodeIds: DatasetSample.outletNodeIds,
		})
		.from(DatasetSample)
		.where(eq(DatasetSample.datasetId, id))
		.orderBy(asc(DatasetSample.position))
		.all();
	const sidecar = JSON.parse(record.sidecarSnapshot) as DatasetSidecar;
	const timeZone =
		sidecar.columns.find((column) => "axis" in column && column.axis === "time")?.timezone ?? null;
	const analysis = record.analysisSnapshot
		? (JSON.parse(record.analysisSnapshot) as DatasetSummary)
		: null;
	const url = new URL(request.url);
	const page = Number(url.searchParams.get("page") ?? "1");
	const pageCount = Math.max(1, Math.ceil(dataset.rowCount / PAGE_SIZE));
	if (!Number.isSafeInteger(page) || page < 1 || page > pageCount)
		throw new Response("Page not found.", { status: 404 });
	const storage = container.get(StorageEngine);
	let rows: Record<string, unknown>[];
	try {
		const byteLength = await storage.size(record.dataPath);
		rows = await parquetReadObjects({
			file: {
				byteLength,
				slice: async (start: number, end?: number) =>
					new Response(
						await storage.read(record.dataPath, {
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
			throw new Response("Dataset data not found.", { status: 404 });
		throw error;
	}
	return {
		dataset: {
			...dataset,
			startTime: dataset.startTime?.toISOString() ?? null,
			endTime: dataset.endTime?.toISOString() ?? null,
			importedAt: dataset.importedAt.toISOString(),
		},
		columns,
		rig: record.rig,
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
		samples,
		sidecarName: record.sidecarName ?? "Sidecar TOML",
		page,
		pageCount,
		rowStart: (page - 1) * PAGE_SIZE,
	};
}

export default function FilesDatasetsDatasetId({ loaderData }: Route.ComponentProps) {
	const { dataset, columns, rig, rows, page, pageCount, samples, analysis, timeZone, rowStart } =
		loaderData;
	const base = `/files/datasets/${dataset.id}`;
	const xColumn = columns.find((column) => column.axis === "numeric" || column.axis === "time");
	const numericAxis = xColumn?.axis === "numeric";
	const chartAxis = xColumn
		? {
				kind: numericAxis ? ("numeric" as const) : ("time" as const),
				name: xColumn.displayName,
				unit: xColumn.unit ?? "",
			}
		: { kind: "time" as const, name: "Time", unit: "" };
	const overviewRows = analysis
		? analysis.overview.map((point) =>
				columns.map((column, position) =>
					column.parquetType === "TIMESTAMP"
						? "time" in point
							? point.time
							: null
						: column.axis === "numeric"
							? "x" in point
								? String(point.x)
								: null
							: (point.values[position]?.toString() ?? null),
				),
			)
		: rows;
	const sampleCharts = datasetCharts(columns, samples, overviewRows);
	const hasChartData = sampleCharts.some((sample) =>
		sample.sections.some((section) => section.charts.length > 0),
	);
	const dateTime = new Intl.DateTimeFormat("en", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: timeZone ?? "UTC",
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
		timeZone: timeZone ?? "UTC",
	});
	return (
		<div className="space-y-8">
			<div>
				<Link to="/files" className="text-sm text-foreground-muted hover:underline">
					All datasets
				</Link>
				<h1 className="mt-3 text-2xl font-semibold">{dataset.csvName}</h1>
			</div>
			<section className="space-y-2 rounded-xl border border-border bg-surface p-4 text-sm">
				<p>
					{dataset.rowCount.toLocaleString()} rows · Operator {dataset.operatorEmail} · Rig{" "}
					{rig ? (
						<Link className="underline" to={inventoryEntryPath("rig", rig.slug)}>
							{rig.name}
						</Link>
					) : (
						"Unknown"
					)}
				</p>
				{dataset.startTime && dataset.endTime ? (
					<p className="text-foreground-muted">
						Recorded {formatTime(dataset.startTime)} to {formatTime(dataset.endTime)} {timeZone}
					</p>
				) : (
					<p className="text-foreground-muted">
						X axis: {chartAxis.name} ({chartAxis.unit})
					</p>
				)}
				<p className="text-foreground-muted">
					Imported {formatTime(dataset.importedAt)} {timeZone ?? "UTC"}
				</p>
				<div className="flex flex-wrap gap-4 underline">
					<a href={`/files/originals/${dataset.csvFileId}`}>Source CSV</a>
					<a href={`/files/originals/${dataset.sidecarFileId}`}>{loaderData.sidecarName}</a>
				</div>
			</section>
			<section className="space-y-6">
				<h2 className="text-lg font-semibold">Trends</h2>
				<p className="text-sm text-foreground-muted">
					{analysis
						? `Overview of all ${dataset.rowCount.toLocaleString()} rows. Each interval retains its first and last row and channel extremes.`
						: `Showing rows ${(rowStart + 1).toLocaleString()}–${(rowStart + rows.length).toLocaleString()} of ${dataset.rowCount.toLocaleString()}.`}{" "}
					Solid lines show measurements. Dashed lines show setpoints.{" "}
					{numericAxis
						? `The x axis is ${chartAxis.name} (${chartAxis.unit}).`
						: `Times use ${timeZone}.`}
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
													axis={chartAxis}
													timeZone={timeZone ?? "UTC"}
													headingLevel="h5"
												/>
											))}
										</div>
									</div>
								))}
						</div>
					))
				) : (
					<p className="text-sm text-foreground-muted">No numeric channels are available.</p>
				)}
			</section>
			{analysis ? (
				<section className="space-y-3">
					<h2 className="text-lg font-semibold">Data quality</h2>
					<p className="text-sm text-foreground-muted">
						{numericAxis
							? `${(analysis.nonIncreasingAxisSteps ?? 0).toLocaleString()} repeated or backward axis steps`
							: `${analysis.nonIncreasingTimeSteps.toLocaleString()} repeated or backward time steps`}
						{numericAxis
							? analysis.largestAxisStep === null || analysis.largestAxisStep === undefined
								? "."
								: ` · Longest forward step: ${analysis.largestAxisStep.toLocaleString()} ${chartAxis.unit}.`
							: analysis.largestTimeStepMs === null
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
														{column.displayName}
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
										{column.displayName}
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
