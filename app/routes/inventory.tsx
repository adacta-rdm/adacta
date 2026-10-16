import { BuildingOffice2Icon } from "@heroicons/react/20/solid";
import { eq, isNull } from "drizzle-orm";
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
import { inventoryEntryPath } from "~/app/lib/inventory.ts";
import { groupByLocation, type Building, type Located } from "~/app/lib/location.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { SidebarItem, SidebarLabel, SidebarSection } from "~/catalyst-ui/sidebar.tsx";
import { Equipment } from "~/drizzle/schema/Equipment.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { Rig } from "~/drizzle/schema/Rig.ts";

import type { Route } from "./+types/inventory.ts";

export async function loader({ context }: Route.LoaderArgs) {
	const db = context.get(services).get(ApplicationDatabase);

	const rigs = await db
		.select({
			id: Rig.id,
			slug: Rig.slug,
			name: Rig.name,
			location: {
				building: Rig.locationBuildingIdentifier,
				room: Rig.locationRoomIdentifier,
				label: Rig.locationLabel,
			},
		})
		.from(Rig)
		.where(isNull(Rig.metadataArchivedAt));

	// A unit has no name of its own. Its product supplies it.
	const equipment = await db
		.select({
			id: Equipment.id,
			slug: Equipment.slug,
			name: Product.name,
			location: {
				building: Equipment.locationBuildingIdentifier,
				room: Equipment.locationRoomIdentifier,
				label: Equipment.locationLabel,
			},
		})
		.from(Equipment)
		.innerJoin(Product, eq(Product.id, Equipment.productId))
		.where(isNull(Equipment.metadataArchivedAt));

	const entries: Entry[] = [
		...rigs.map((rig) => ({ ...rig, kind: "rig" as const })),
		...equipment.map((unit) => ({ ...unit, kind: "equipment" as const })),
	];

	return { buildings: groupByLocation(entries) };
}

/**
 * Each entry has an ID, slug, name, kind, and location.
 */
export type Entry = Located & { id: number; slug: string; kind: InventoryKind };

function LocationTree({
	buildings,
	currentPath,
}: {
	buildings: Building<Entry>[];
	currentPath: string | undefined;
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
												href={inventoryEntryPath(entry.kind, entry.slug)}
												current={inventoryEntryPath(entry.kind, entry.slug) === currentPath}
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
		const matches = useMatches();

		// Both kinds name their parameter "slug". The matched route tells them apart.
		const rig = matches.find((match) => match.id === "routes/inventory.rigs.$slug");
		const equipment = matches.find((match) => match.id === "routes/inventory.equipment.$slug");
		const currentPath = rig?.params.slug
			? inventoryEntryPath("rig", rig.params.slug)
			: equipment?.params.slug
				? inventoryEntryPath("equipment", equipment.params.slug)
				: undefined;
		if (!data) return null;
		return (
			<SidebarSection>
				<SidebarItem href="/inventory" current={!currentPath}>
					<SidebarLabel>All entries</SidebarLabel>
				</SidebarItem>
				<LocationTree buildings={data.buildings} currentPath={currentPath} />
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
