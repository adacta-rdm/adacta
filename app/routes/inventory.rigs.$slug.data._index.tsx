import { ChartBarIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { Link } from "react-router";

import { services } from "~/app/.server/context.ts";
import { TimeSeriesSparkline } from "~/app/components/TimeSeriesSparkline.tsx";
import { datasetCharts } from "~/app/lib/datasetCharts.ts";
import type { DatasetSummary } from "~/app/lib/datasetSummary.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Subheading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";
import { Dataset } from "~/drizzle/schema/Dataset.ts";
import { DatasetColumn } from "~/drizzle/schema/DatasetColumn.ts";
import { OriginalFile } from "~/drizzle/schema/OriginalFile.ts";
import { Rig } from "~/drizzle/schema/Rig.ts";

import type { Route } from "./+types/inventory.rigs.$slug.data._index.ts";

export async function loader({ context, params }: Route.LoaderArgs) {
	const db = context.get(services).get(ApplicationDatabase);
	const rig = await db.select({ id: Rig.id }).from(Rig).where(eq(Rig.slug, params.slug)).get();

	if (!rig) {
		throw new Response(`Rig "${params.slug}" not found.`, { status: 404 });
	}

	const datasets = await db
		.select({
			id: Dataset.id,
			csvName: OriginalFile.originalName,
			rowCount: Dataset.rowCount,
			operatorEmail: Dataset.operatorEmail,
			startTime: Dataset.startTime,
			importedAt: Dataset.metadataCreationTimestamp,
			analysisSnapshot: Dataset.analysisSnapshot,
		})
		.from(Dataset)
		.innerJoin(OriginalFile, eq(OriginalFile.id, Dataset.csvFileId))
		.where(
			and(
				eq(Dataset.rigId, rig.id),
				isNull(Dataset.metadataArchivedAt),
				isNull(OriginalFile.metadataArchivedAt),
			),
		)
		.orderBy(desc(Dataset.metadataCreationTimestamp))
		.all();
	const columns = datasets.length
		? await db
				.select({
					datasetId: DatasetColumn.datasetId,
					id: sql<string>`cast(${DatasetColumn.id} as text)`,
					position: DatasetColumn.position,
					displayName: DatasetColumn.name,
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
				.where(
					inArray(
						DatasetColumn.datasetId,
						datasets.map(({ id }) => id),
					),
				)
				.orderBy(asc(DatasetColumn.position))
				.all()
		: [];
	const columnsByDataset = new Map<number, typeof columns>();
	for (const column of columns) {
		const datasetColumns = columnsByDataset.get(column.datasetId) ?? [];
		datasetColumns.push(column);
		columnsByDataset.set(column.datasetId, datasetColumns);
	}

	return {
		datasets: datasets.map((dataset) => {
			const datasetColumns = columnsByDataset.get(dataset.id) ?? [];
			const analysis = dataset.analysisSnapshot
				? (JSON.parse(dataset.analysisSnapshot) as DatasetSummary)
				: null;
			const rows = analysis
				? analysis.overview.map((point) =>
						datasetColumns.map((column) =>
							column.parquetType === "TIMESTAMP"
								? "time" in point
									? point.time
									: null
								: column.axis === "numeric"
									? "x" in point
										? String(point.x)
										: null
									: (point.values[column.position]?.toString() ?? null),
						),
					)
				: [];
			const charts = analysis
				? datasetCharts(datasetColumns, [], rows).flatMap((sample) =>
						sample.sections.flatMap((section) => section.charts),
					)
				: [];
			const temperatureColumnIds = new Set(
				datasetColumns
					.filter(
						(column) =>
							column.quantityKindId === "Temperature" ||
							column.channelKey?.toLowerCase().includes("temperature") ||
							column.displayName.toLowerCase().includes("temperature"),
					)
					.map((column) => column.id),
			);
			const temperatureChart = charts.find((chart) =>
				chart.series.some((series) => temperatureColumnIds.has(series.id ?? "")),
			);

			return {
				id: dataset.id,
				csvName: dataset.csvName,
				rowCount: dataset.rowCount,
				operatorEmail: dataset.operatorEmail,
				startTime: dataset.startTime?.toISOString() ?? null,
				importedAt: dataset.importedAt.toISOString(),
				preview: temperatureChart
					? {
							...temperatureChart,
							series: temperatureChart.series.map((series) => ({
								...series,
								data: series.data.map((point) =>
									"time" in point ? { time: point.time.toISOString(), value: point.value } : point,
								),
							})),
						}
					: null,
			};
		}),
	};
}

export default function InventoryRigsSlugDataIndex({ loaderData }: Route.ComponentProps) {
	return (
		<section>
			<Subheading>Recorded data</Subheading>
			<Text className="mt-2">Datasets imported for this rig.</Text>

			{loaderData.datasets.length === 0 ? (
				<p className="mt-6 text-sm text-foreground-muted">
					No datasets have been imported for this rig.
				</p>
			) : (
				<ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
					{loaderData.datasets.map((dataset) => (
						<li key={dataset.id}>
							<Link
								to={`/files/datasets/${dataset.id}`}
								className="grid items-center gap-4 p-4 hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus lg:grid-cols-[minmax(0,1fr)_auto]"
							>
								<span className="flex min-w-0 items-center gap-4">
									<span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-muted text-foreground-muted">
										<ChartBarIcon className="size-5" />
									</span>
									<span className="min-w-0 flex-1">
										<span className="block truncate font-semibold text-foreground">
											{dataset.csvName}
										</span>
										<span className="mt-1 block text-sm text-foreground-muted">
											{dataset.rowCount.toLocaleString()} rows
											{dataset.operatorEmail ? ` · ${dataset.operatorEmail}` : ""}
											{dataset.startTime ? ` · Starts ${formatDate(dataset.startTime)}` : ""}
										</span>
									</span>
								</span>
								<span className="flex min-w-0 items-center gap-3">
									<span className="min-w-0 flex-1 lg:w-48 lg:flex-none">
										{dataset.preview ? <TimeSeriesSparkline {...dataset.preview} /> : null}
									</span>
									<span className="flex shrink-0 items-center gap-2 text-sm text-foreground-muted">
										Imported {formatDate(dataset.importedAt)}
										<ChevronRightIcon className="size-5" />
									</span>
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

function formatDate(value: string) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}
