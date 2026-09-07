import { useRouteLoaderData } from "react-router";

import { formatTimestamp } from "~/app/lib/dates.ts";

import type { loader as entryLoader } from "./$repo.inventory.$entrySlug.tsx";

export default function RepoInventoryEntrySlugIndex() {
	const data = useRouteLoaderData<typeof entryLoader>("routes/$repo.inventory.$entrySlug")!;

	return (
		<div className="space-y-2 text-sm text-foreground-muted">
			<p>Added by: {data.entry.createdBy?.name ?? "Unknown"}</p>
			<p>
				Added to Adacta:{" "}
				<time dateTime={data.entry.createdAt.toISOString()}>
					{formatTimestamp(data.entry.createdAt)}
				</time>
			</p>
		</div>
	);
}
