import { BuildingOffice2Icon } from "@heroicons/react/20/solid";
import { isNull } from "drizzle-orm";
import { Outlet, useMatches, useRouteLoaderData } from "react-router";

import { services } from "~/app/.server/context.ts";
import { KindIcon, type InventoryKind } from "~/app/components/KindIcon.tsx";
import type { BreadcrumbHandle } from "~/app/components/PageBreadcrumbs.tsx";
import type { LeftSidebarHandle } from "~/app/layout/routeSidebar.ts";
import {
	SIDEBAR_TREE_LEVEL_1_LIST,
	SIDEBAR_TREE_LEVEL_1_ROW,
	SIDEBAR_TREE_LEVEL_2_ITEM,
	SIDEBAR_TREE_LEVEL_2_LIST,
	SIDEBAR_TREE_ROW,
} from "~/app/layout/sidebarTreeStyles.ts";
import { groupByLocation, type Building, type Located } from "~/app/lib/location.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { SidebarItem, SidebarLabel, SidebarSection } from "~/catalyst-ui/sidebar.tsx";
import { InventoryEntry as InventoryEntryTable } from "~/drizzle/schema/InventoryEntry.ts";

import type { Route } from "./+types/inventory.ts";

export async function loader({ context }: Route.LoaderArgs) {
	const db = context.get(services).get(ApplicationDatabase);
	const entries = (
		await db
			.select()
			.from(InventoryEntryTable)
			.where(isNull(InventoryEntryTable.metadataArchivedAt))
			.all()
	).map((row) => ({
		id: row.id,
		slug: row.slug,
		name: row.name,
		kind: row.kind,
		location: {
			building: row.locationBuildingIdentifier,
			room: row.locationRoomIdentifier,
			label: row.locationLabel,
		},
	}));

	return { entries, buildings: groupByLocation(entries) };
}

/**
 * Each entry has an ID, slug, name, kind, and location.
 */
export type Entry = Located & { id: number; slug: string; kind: InventoryKind };

function LocationTree({
	buildings,
	entrySlug,
}: {
	buildings: Building<Entry>[];
	entrySlug: string | undefined;
}) {
	return (
		<ul aria-label="Inventory by location" className="space-y-2">
			{buildings.map((building) => (
				<li key={building.identifier ?? "unassigned-building"}>
					<div className={`${SIDEBAR_TREE_ROW} text-sm font-semibold text-foreground`}>
						<BuildingOffice2Icon className="size-4 shrink-0 text-foreground-muted" />
						<span className="truncate">
							{building.identifier ? `Building ${building.identifier}` : "Unassigned"}
						</span>
					</div>

					<ul className={SIDEBAR_TREE_LEVEL_1_LIST}>
						{building.rooms.map((room) => (
							<li key={room.identifier ?? "unassigned-room"}>
								<div
									className={`${SIDEBAR_TREE_ROW} ${SIDEBAR_TREE_LEVEL_1_ROW} text-xs font-medium text-foreground-muted`}
								>
									{room.identifier ? `Room ${room.identifier}` : "Unassigned"}
								</div>

								<ul className={SIDEBAR_TREE_LEVEL_2_LIST}>
									{room.entries.map((entry) => (
										<li key={entry.id}>
											<SidebarItem
												href={`/inventory/${entry.slug}`}
												current={entry.slug === entrySlug}
												className={SIDEBAR_TREE_LEVEL_2_ITEM}
											>
												<KindIcon kind={entry.kind} />
												<SidebarLabel>{entry.name}</SidebarLabel>
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
	breadcrumb: "Inventory",
	leftSidebar: function InventorySidebarFromRoute() {
		const data = useRouteLoaderData<typeof loader>("routes/inventory");
		const entrySlug = useMatches().at(-1)?.params.entrySlug;
		if (!data) return null;
		return (
			<SidebarSection>
				<SidebarItem href="/inventory" current={!entrySlug}>
					<SidebarLabel>All entries</SidebarLabel>
				</SidebarItem>
				<LocationTree buildings={data.buildings} entrySlug={entrySlug} />
			</SidebarSection>
		);
	},
} satisfies BreadcrumbHandle & LeftSidebarHandle;

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

export function meta() {
	return [{ title: "Inventory — Adacta" }];
}

/**
 * Provides the page content selected within the inventory section.
 */
export default function Inventory() {
	return <Outlet />;
}
