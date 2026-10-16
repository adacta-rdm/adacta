import { useRouteLoaderData } from "react-router";

import { formatTimestamp } from "~/app/lib/dates.ts";

import type { loader as entryLoader } from "./inventory.rigs.$slug.tsx";

export default function InventoryRigsSlugIndex() {
	const data = useRouteLoaderData<typeof entryLoader>("routes/inventory.rigs.$slug")!;

	return (
		<div className="space-y-2 text-sm text-foreground-muted">
			<p>Added by: {data.createdBy}</p>
			<p>
				Added to Adacta:{" "}
				<time dateTime={data.createdAt.toISOString()}>{formatTimestamp(data.createdAt)}</time>
			</p>
		</div>
	);
}
