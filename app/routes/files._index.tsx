import {
	ChartBarIcon,
	ChevronRightIcon,
	DocumentTextIcon,
	PlusIcon,
} from "@heroicons/react/20/solid";
import { asc, desc, eq, isNull } from "drizzle-orm";
import { Link } from "react-router";

import { services } from "~/app/.server/context.ts";
import type { BreadcrumbHandle } from "~/app/components/PageBreadcrumbs.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Heading, Subheading } from "~/catalyst-ui/heading.tsx";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { MeasurementDataset } from "~/drizzle/schema/MeasurementDataset.ts";
import { OriginalFile } from "~/drizzle/schema/OriginalFile.ts";

import type { Route } from "./+types/files._index.ts";

export const handle = { breadcrumb: "Files" } satisfies BreadcrumbHandle;

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

export function meta() {
	return [{ title: "Files — Adacta" }];
}

export async function loader({ context }: Route.LoaderArgs) {
	const db = context.get(services).get(ApplicationDatabase);
	const [measurements, fileRows] = await Promise.all([
		db
			.select({
				id: MeasurementDataset.id,
				csvName: OriginalFile.originalName,
				rigName: InventoryEntry.name,
				rowCount: MeasurementDataset.rowCount,
				operatorEmail: MeasurementDataset.operatorEmail,
				startTime: MeasurementDataset.startTime,
				endTime: MeasurementDataset.endTime,
				importedAt: MeasurementDataset.metadataCreationTimestamp,
			})
			.from(MeasurementDataset)
			.innerJoin(OriginalFile, eq(OriginalFile.id, MeasurementDataset.csvFileId))
			.leftJoin(InventoryEntry, eq(InventoryEntry.id, MeasurementDataset.rigId))
			.where(isNull(MeasurementDataset.metadataArchivedAt))
			.orderBy(desc(MeasurementDataset.metadataCreationTimestamp))
			.all(),
		db
			.select({
				uploadId: OriginalFile.uploadId,
				originalName: OriginalFile.originalName,
				createdAt: OriginalFile.metadataCreationTimestamp,
			})
			.from(OriginalFile)
			.where(isNull(OriginalFile.metadataArchivedAt))
			.orderBy(desc(OriginalFile.uploadId), asc(OriginalFile.metadataCreationTimestamp))
			.all(),
	]);

	const uploads = new Map<number, string[]>();
	for (const file of fileRows) {
		const names = uploads.get(file.uploadId) ?? [];
		names.push(file.originalName);
		uploads.set(file.uploadId, names);
	}

	return {
		measurements: measurements.map((measurement) => ({
			...measurement,
			startTime: measurement.startTime?.toISOString() ?? null,
			endTime: measurement.endTime?.toISOString() ?? null,
			importedAt: measurement.importedAt.toISOString(),
		})),
		uploads: [...uploads].map(([id, fileNames]) => ({ id, fileNames })),
	};
}

export default function FilesIndex({ loaderData }: Route.ComponentProps) {
	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<Heading>Files</Heading>
					<p className="mt-2 text-sm text-foreground-muted">
						Original uploads and imported measurement datasets.
					</p>
				</div>
				<Link
					to="/files/import"
					className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
				>
					<PlusIcon className="size-4" /> Upload files
				</Link>
			</div>

			<section className="space-y-4">
				<Subheading>Measurements</Subheading>
				{loaderData.measurements.length === 0 ? (
					<div className="rounded-xl border border-border bg-surface px-6 py-12 text-center">
						<ChartBarIcon className="mx-auto size-8 text-foreground-muted" />
						<p className="mt-3 font-semibold text-foreground">No measurements imported yet</p>
						<p className="mt-1 text-sm text-foreground-muted">
							Drop a CSV and its TOML sidecar on a rig to import measurements.
						</p>
					</div>
				) : (
					<ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
						{loaderData.measurements.map((measurement) => (
							<li key={measurement.id}>
								<Link
									to={`/files/measurements/${measurement.id}`}
									className="flex items-center gap-4 px-5 py-4 hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
								>
									<ChartBarIcon className="size-5 shrink-0 text-foreground-muted" />
									<span className="min-w-0 flex-1">
										<span className="block truncate font-semibold text-foreground">
											{measurement.csvName}
										</span>
										<span className="mt-1 block text-sm text-foreground-muted">
											{measurement.rowCount.toLocaleString()} rows · {measurement.operatorEmail} ·
											Rig {measurement.rigName ?? "Unknown"}
										</span>
									</span>
									<span className="hidden text-right text-sm text-foreground-muted sm:block">
										<span className="block">{formatTime(measurement.startTime)}</span>
										<span className="mt-1 block text-xs">
											Imported {formatTime(measurement.importedAt)} UTC
										</span>
									</span>
									<ChevronRightIcon className="size-5 shrink-0 text-foreground-muted" />
								</Link>
							</li>
						))}
					</ul>
				)}
			</section>

			<section className="space-y-4">
				<Subheading>Original uploads</Subheading>
				{loaderData.uploads.length === 0 ? (
					<p className="text-sm text-foreground-muted">No files uploaded yet.</p>
				) : (
					<ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
						{loaderData.uploads.map((upload) => (
							<li key={upload.id}>
								<Link
									to={`/files/${upload.id}`}
									className="flex items-center gap-4 px-5 py-4 hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
								>
									<DocumentTextIcon className="size-5 shrink-0 text-foreground-muted" />
									<span className="min-w-0 flex-1">
										<span className="block truncate font-semibold text-foreground">
											{upload.fileNames.join(", ")}
										</span>
										<span className="mt-1 block text-sm text-foreground-muted">
											{upload.fileNames.length} {upload.fileNames.length === 1 ? "file" : "files"}
										</span>
									</span>
									<ChevronRightIcon className="size-5 shrink-0 text-foreground-muted" />
								</Link>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}

function formatTime(value: string | null): string {
	if (!value) return "No timestamp";
	return new Intl.DateTimeFormat("en", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "UTC",
	}).format(new Date(value));
}
