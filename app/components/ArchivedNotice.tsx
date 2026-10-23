import { Link } from "react-router";

import { formatTimestamp } from "~/app/lib/dates.ts";

/**
 * Identifies an archived record and directs restoration to its inventory list.
 */
export function ArchivedNotice({ at, kind }: { at: Date; kind: "rig" | "equipment" }) {
	return (
		<p className="mt-2 text-sm text-foreground-muted">
			Archived <time dateTime={at.toISOString()}>{formatTimestamp(at)}</time>. This record is read
			only.{" "}
			<Link
				to={`/inventory?${kind === "rig" ? "rigs" : "equipment"}=archived`}
				className="text-link hover:text-link-hover focus-visible:outline-2 focus-visible:outline-focus"
			>
				Restore from Inventory
			</Link>
		</p>
	);
}
