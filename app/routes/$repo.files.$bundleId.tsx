import { ArrowDownTrayIcon, DocumentTextIcon } from "@heroicons/react/20/solid";
import { Link } from "react-router";

import { services } from "~/app/.server/context";
import { SourceFileNotFoundError, SourceManager } from "~/app/services/SourceManager";
import { Heading, Subheading } from "~/catalyst-ui/heading";
import { Text } from "~/catalyst-ui/text";
import { FileNotFoundError } from "~/lib/storage-engine/FileNotFoundError";

import type { Route } from "./+types/$repo.files.$bundleId";

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary";

export function meta() {
	return [{ title: "Source bundle — Adacta" }];
}

export async function loader({ context, params }: Route.LoaderArgs) {
	try {
		const bundle = context.get(services).get(SourceManager).getBundle(params.bundleId);
		return { bundle };
	} catch (error) {
		if (error instanceof SourceFileNotFoundError || error instanceof FileNotFoundError) {
			throw new Response("Source bundle not found.", { status: 404 });
		}
		throw error;
	}
}

export default function FileBundle({ loaderData, params }: Route.ComponentProps) {
	return (
		<div className="space-y-8">
			<div>
				<Heading>Source bundle</Heading>
				<Text className="mt-2">
					The original files are stored together with their import result.
				</Text>
			</div>

			<section className="rounded-xl border border-border bg-surface p-5">
				<Subheading>Original files</Subheading>
				<ul className="mt-4 divide-y divide-border">
					{loaderData.bundle.artifacts.map((artifact) => (
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

			<section className="rounded-xl border border-border bg-surface p-5">
				<Subheading>Import result</Subheading>
				<Text className="mt-2">No import result is available.</Text>
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
