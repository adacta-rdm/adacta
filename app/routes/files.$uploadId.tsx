import {
	ArrowDownTrayIcon,
	ChartBarIcon,
	ChevronRightIcon,
	DocumentTextIcon,
} from "@heroicons/react/20/solid";
import { eq } from "drizzle-orm";
import { Link, useSearchParams } from "react-router";

import { services } from "~/app/.server/context.ts";
import type { BreadcrumbHandle } from "~/app/components/PageBreadcrumbs.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { UploadManager, UploadNotFoundError } from "~/app/services/UploadManager.ts";
import { Heading, Subheading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";
import { Dataset } from "~/drizzle/schema/Dataset.ts";
import { OriginalFile } from "~/drizzle/schema/OriginalFile.ts";
import { Rig } from "~/drizzle/schema/Rig.ts";
import { parseId53 } from "~/lib/id53/parseId53.ts";
import { FileNotFoundError } from "~/lib/storage-engine/FileNotFoundError.ts";

import type { Route } from "./+types/files.$uploadId.ts";

export const handle = { breadcrumb: "Uploaded files" } satisfies BreadcrumbHandle;

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

export function meta() {
	return [{ title: "Uploaded files — Adacta" }];
}

export async function loader({ context, params }: Route.LoaderArgs) {
	const uploadId = parseId53(params.uploadId);

	// Text that is not an ID gets the same answer as an unknown ID.
	if (uploadId === undefined) throw new Response("Upload not found.", { status: 404 });

	try {
		const container = context.get(services);
		const files = await container.get(UploadManager).filesOfUpload(uploadId);
		const imports = await container
			.get(ApplicationDatabase)
			.select({
				id: Dataset.id,
				csvName: OriginalFile.originalName,
				rigName: Rig.name,
				rowCount: Dataset.rowCount,
			})
			.from(Dataset)
			.innerJoin(OriginalFile, eq(OriginalFile.id, Dataset.csvFileId))
			.innerJoin(Rig, eq(Rig.id, Dataset.rigId))
			.where(eq(Dataset.uploadId, uploadId))
			.all();
		return {
			files,
			canImportDatasets:
				files.length === 2 &&
				files.filter((file) => /\.csv$/i.test(file.originalName)).length === 1 &&
				files.filter((file) => /\.toml$/i.test(file.originalName)).length === 1 &&
				imports.length === 0,
			datasetImports: imports,
		};
	} catch (error) {
		if (error instanceof UploadNotFoundError || error instanceof FileNotFoundError) {
			throw new Response("Upload not found.", { status: 404 });
		}
		throw error;
	}
}

export default function FilesUploadId({ loaderData }: Route.ComponentProps) {
	const [searchParams] = useSearchParams();
	const contextKind = searchParams.get("contextKind");
	const contextSlug = searchParams.get("contextSlug");
	const contextLabel = searchParams.get("contextLabel");
	const contextQuery =
		(contextKind === "inventory-entry" || contextKind === "sample-batch") &&
		contextSlug &&
		contextLabel
			? `?${new URLSearchParams({ contextKind, contextSlug, contextLabel })}`
			: "";

	return (
		<div className="space-y-8">
			<div>
				<Heading>Uploaded files</Heading>
				<Text className="mt-2">
					These files were supplied in one upload. Each file is kept exactly as it arrived.
				</Text>
			</div>
			<section className="rounded-xl border border-border bg-surface p-5">
				<Subheading>Original files</Subheading>
				<ul className="mt-4 divide-y divide-border">
					{loaderData.files.map((file) => (
						<li key={file.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
							<DocumentTextIcon className="size-5 shrink-0 text-foreground-muted" />
							<span className="min-w-0 flex-1">
								<span className="block truncate text-sm font-medium text-foreground">
									{file.originalName}
								</span>
								<span className="block text-xs text-foreground-muted">
									{formatFileSize(file.byteSize)}
								</span>
							</span>
							<a
								href={`/files/originals/${file.id}`}
								aria-label={`Download ${file.originalName}`}
								className="rounded-md p-2 text-foreground-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus"
							>
								<ArrowDownTrayIcon className="size-5" />
							</a>
						</li>
					))}
				</ul>
			</section>

			{loaderData.datasetImports.length ? (
				<section className="rounded-xl border border-border bg-surface p-5">
					<Subheading>Imported datasets</Subheading>
					<ul className="mt-4 divide-y divide-border">
						{loaderData.datasetImports.map((item) => (
							<li key={item.id}>
								<Link
									to={`/files/datasets/${item.id}`}
									className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
								>
									<ChartBarIcon className="size-5 shrink-0 text-foreground-muted" />
									<span className="min-w-0 flex-1">
										<span className="block truncate text-sm font-medium text-foreground">
											{item.csvName}
										</span>
										<span className="block text-xs text-foreground-muted">
											{item.rowCount.toLocaleString()} rows · Rig {item.rigName}
										</span>
									</span>
									<ChevronRightIcon className="size-5 shrink-0 text-foreground-muted" />
								</Link>
							</li>
						))}
					</ul>
				</section>
			) : null}

			<div className="flex flex-wrap items-center gap-4">
				{loaderData.canImportDatasets ? (
					<Link
						to={`/files/${loaderData.files[0]!.uploadId}/datasets/import${contextQuery}`}
						className="inline-flex rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
					>
						Import dataset
					</Link>
				) : null}
				<Link
					to="/files/import"
					className="inline-flex rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
				>
					Import more files
				</Link>
			</div>
		</div>
	);
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} ${bytes === 1 ? "byte" : "bytes"}`;
	if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
