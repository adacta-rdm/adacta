import { Link, useRouteLoaderData } from "react-router";

import { KindIcon } from "~/app/components/KindIcon.tsx";
import { formatLocation } from "~/app/lib/location.ts";
import { Badge } from "~/catalyst-ui/badge.tsx";
import { Heading, Subheading } from "~/catalyst-ui/heading.tsx";

import type { loader as appLoader } from "./_app.tsx";

/**
 * The application layout loads inventory entries for the sidebar.
 * This page therefore reads the same data.
 */
export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

export default function InventoryIndex() {
	const data = useRouteLoaderData<typeof appLoader>("routes/_app");

	if (!data) return null;

	return (
		<>
			<Heading>Inventory</Heading>
			<Subheading className="mt-1">Custom rigs and standalone equipment.</Subheading>

			<ul className="mt-6 divide-y divide-border">
				{data.entries.map((entry) => (
					<li key={entry.id}>
						<Link
							to={`/inventory/${entry.slug}`}
							className="flex items-center gap-3 py-3 hover:bg-surface-muted"
						>
							<KindIcon kind={entry.kind} className="size-5 shrink-0 text-foreground-muted" />

							<span className="flex-1 font-medium">{entry.name}</span>

							<span className="text-sm text-foreground-muted">
								{formatLocation(entry.location) || "No location"}
							</span>

							<Badge color={entry.kind === "rig" ? "cyan" : "zinc"}>
								{entry.kind === "rig" ? "P&ID" : "Standalone"}
							</Badge>
						</Link>
					</li>
				))}
			</ul>
		</>
	);
}
