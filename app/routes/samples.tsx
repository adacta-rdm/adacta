import { BeakerIcon, PlusIcon } from "@heroicons/react/20/solid";
import { asc, isNull } from "drizzle-orm";
import { Outlet, useLocation, useMatches, useRouteLoaderData } from "react-router";

import { services } from "~/app/.server/context.ts";
import type { BreadcrumbHandle } from "~/app/components/PageBreadcrumbs.tsx";
import type { LeftSidebarHandle } from "~/app/layout/routeSidebar.ts";
import {
	SIDEBAR_TREE_LEVEL_1_LIST,
	SIDEBAR_TREE_LEVEL_1_ROW,
	SIDEBAR_TREE_LEVEL_2_ITEM,
	SIDEBAR_TREE_LEVEL_2_LIST,
	SIDEBAR_TREE_ROW,
} from "~/app/layout/sidebarTreeStyles.ts";
import { type BatchGroup, groupBatchesByComposition } from "~/app/lib/batchComposition.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { SidebarItem, SidebarLabel, SidebarSection } from "~/catalyst-ui/sidebar.tsx";
import type { Entity } from "~/drizzle/Schema.ts";
import { SampleBatch } from "~/drizzle/schema/SampleBatch.ts";

import type { Route } from "./+types/samples.ts";

export async function loader({ context }: Route.LoaderArgs) {
	const db = context.get(services).get(ApplicationDatabase);
	const batches = await db
		.select()
		.from(SampleBatch)
		.where(isNull(SampleBatch.metadataArchivedAt))
		.orderBy(asc(SampleBatch.name))
		.all();

	return { batchGroups: groupBatchesByComposition(batches) };
}

export type Batch = Pick<
	Entity<"SampleBatch">,
	"id" | "slug" | "name" | "activeMaterial" | "support"
>;

function BatchTree({
	groups,
	batchSlug,
}: {
	groups: BatchGroup<Batch>[];
	batchSlug: string | undefined;
}) {
	if (groups.length === 0) {
		return <p className="px-2 py-2 text-sm text-foreground-muted">No batches found.</p>;
	}

	return (
		<ul role="tree" aria-label="Batches by composition" className="space-y-2">
			{groups.map((material) => (
				<li key={material.name ?? "unassigned-material"} role="treeitem" aria-expanded="true">
					<div className={`${SIDEBAR_TREE_ROW} text-sm font-semibold text-foreground`}>
						<BeakerIcon className="size-4 shrink-0 text-foreground-muted" />
						<span className="truncate">{material.name ?? "No active material"}</span>
					</div>

					<ul role="group" className={SIDEBAR_TREE_LEVEL_1_LIST}>
						{material.supports.map((support) => (
							<li key={support.name ?? "unassigned-support"} role="treeitem" aria-expanded="true">
								<div
									className={`${SIDEBAR_TREE_ROW} ${SIDEBAR_TREE_LEVEL_1_ROW} text-xs font-medium text-foreground-muted`}
								>
									{support.name ?? "No support"}
								</div>

								<ul role="group" className={SIDEBAR_TREE_LEVEL_2_LIST}>
									{support.batches.map((batch) => (
										<li key={batch.id} role="treeitem">
											<SidebarItem
												href={`/samples/${batch.slug}`}
												current={batch.slug === batchSlug}
												className={SIDEBAR_TREE_LEVEL_2_ITEM}
											>
												<SidebarLabel>{batch.name}</SidebarLabel>
											</SidebarItem>
										</li>
									))}
								</ul>
							</li>
						))}
					</ul>
				</li>
			))}
		</ul>
	);
}

export const handle = {
	breadcrumb: "Samples",
	leftSidebar: function SamplesSidebarFromRoute() {
		const data = useRouteLoaderData<typeof loader>("routes/samples");
		const batchSlug = useMatches().at(-1)?.params.batchSlug;
		const { pathname } = useLocation();
		if (!data) return null;
		return (
			<SidebarSection>
				<SidebarItem href="/samples" current={pathname === "/samples"}>
					<SidebarLabel>All samples</SidebarLabel>
				</SidebarItem>
				<BatchTree groups={data.batchGroups} batchSlug={batchSlug} />
				<SidebarItem href="/samples/new" current={pathname === "/samples/new"}>
					<PlusIcon />
					<SidebarLabel>Create batch</SidebarLabel>
				</SidebarItem>
			</SidebarSection>
		);
	},
} satisfies BreadcrumbHandle & LeftSidebarHandle;

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

export function meta() {
	return [{ title: "Samples — Adacta" }];
}

/**
 * Provides the page content selected within the samples section.
 */
export default function Samples() {
	return <Outlet />;
}
