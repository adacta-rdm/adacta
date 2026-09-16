import { ArrowDownTrayIcon, DocumentTextIcon } from "@heroicons/react/20/solid";
import { Link } from "react-router";

import { services } from "~/app/.server/context.ts";
import { SourceFileNotFoundError, SourceManager } from "~/app/services/SourceManager.ts";
import { Heading, Subheading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";
import { FileNotFoundError } from "~/lib/storage-engine/FileNotFoundError.ts";

import type { Route } from "./+types/$repo.files.$uploadId.ts";

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

export function meta() {
	return [{ title: "Uploaded files — Adacta" }];
}

export async function loader({ context, params }: Route.LoaderArgs) {
	try {
		const artifacts = await context.get(services).get(SourceManager).artifactsOfUpload(params.uploadId);

		return { artifacts };
	} catch (error) {
		if (error instanceof SourceFileNotFoundError || error instanceof FileNotFoundError) {
			throw new Response("Upload not found.", { status: 404 });
		}
		throw error;
	}
}

export default function RepoFilesUploadId({ loaderData, params }: Route.ComponentProps) {
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
					{loaderData.artifacts.map((artifact) => (
						<li key={artifact.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
							<DocumentTextIcon className="size-5 shrink-0 text-foreground-muted" />
							<span className="min-w-0 flex-1">
								<span className="block truncate text-sm font-medium text-foreground">
									{artifact.originalName}
								</span>
								<span className="block text-xs text-foreground-muted">
									{formatFileSize(artifact.byteSize)}
								</span>
							</span>
							<a
								href={`/${params.repo}/files/artifacts/${artifact.id}`}
								aria-label={`Download ${artifact.originalName}`}
								className="rounded-md p-2 text-foreground-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus"
							>
								<ArrowDownTrayIcon className="size-5" />
							</a>
						</li>
					))}
				</ul>
			</section>

			<Link
				to={`/${params.repo}/files/import`}
				className="inline-flex rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
			>
				Import more files
			</Link>
		</div>
	);
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} ${bytes === 1 ? "byte" : "bytes"}`;
	if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
