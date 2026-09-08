/**
 * Application shell for a single repository.
 *
 * The sidebar is split into three zones. The top zone holds the repository
 * name and one link per section. It is the same on every page. The middle
 * zone shows the tree of the section in view. For example, a page in the
 * inventory section shows the Building -> Room -> Entry tree. A page in the
 * samples section shows the active material -> support -> batch tree. The
 * bottom zone links to the manual.
 */
import {
	AcademicCapIcon,
	ArchiveBoxIcon,
	ArrowUpTrayIcon,
	BeakerIcon,
	BookOpenIcon,
	BuildingOffice2Icon,
	PlusIcon,
} from "@heroicons/react/20/solid";
import type { ReactNode } from "react";
import { useLocation, useParams } from "react-router";

import { KindIcon, type InventoryKind } from "~/app/components/KindIcon.tsx";
import { SidebarLayout } from "~/app/layout/SidebarLayout.tsx";
import type { BatchGroup } from "~/app/lib/batchComposition.ts";
import type { Building, Located } from "~/app/lib/location.ts";
import { sidebarSection } from "~/app/lib/sidebarSection.ts";
import { Navbar, NavbarSection, NavbarSpacer } from "~/catalyst-ui/navbar.tsx";
import {
	Sidebar,
	SidebarBody,
	SidebarDivider,
	SidebarFooter,
	SidebarHeader,
	SidebarHeading,
	SidebarItem,
	SidebarLabel,
	SidebarSection,
} from "~/catalyst-ui/sidebar.tsx";
import type { Entity } from "~/drizzle/Schema.ts";

/**
 * What the sidebar tree is built from: a named, placed entry with a kind.
 */
type Entry = Located & { id: number; slug: string; kind: InventoryKind };

type Batch = Pick<Entity<"SampleBatch">, "id" | "slug" | "name" | "activeMaterial" | "support">;

/*
	A tree row is as wide as the sidebar. Its depth is padding inside the row.
	The marker for the current item sits a fixed distance left of its row, so
	it stays at the edge of the sidebar at every depth. A nested list with a
	margin would carry the marker inward with it.

	The guide line of a nested list is drawn where the margin used to be.
*/
const GROUP_ROW = "flex items-center gap-2 px-2 py-1";
const NESTED_LIST = "relative before:absolute before:inset-y-0 before:w-px before:bg-border";
const LEVEL_1_LIST = `${NESTED_LIST} before:left-4`;
const LEVEL_1_ROW = "pl-6";
const LEVEL_2_LIST = `${NESTED_LIST} before:left-8`;
const LEVEL_2_ITEM = "block pl-9";

function LocationTree({
	buildings,
	repo,
	entrySlug,
}: {
	buildings: Building<Entry>[];
	repo: string | undefined;
	entrySlug: string | undefined;
}) {
	return (
		<ul aria-label="Inventory by location" className="space-y-2">
			{buildings.map((building) => (
				<li key={building.identifier ?? "unassigned-building"}>
					<div className={`${GROUP_ROW} text-sm font-semibold text-foreground`}>
						<BuildingOffice2Icon className="size-4 shrink-0 text-foreground-muted" />
						<span className="truncate">
							{building.identifier ? `Building ${building.identifier}` : "Unassigned"}
						</span>
					</div>

					<ul className={LEVEL_1_LIST}>
						{building.rooms.map((room) => (
							<li key={room.identifier ?? "unassigned-room"}>
								<div
									className={`${GROUP_ROW} ${LEVEL_1_ROW} text-xs font-medium text-foreground-muted`}
								>
									{room.identifier ? `Room ${room.identifier}` : "Unassigned"}
								</div>

								<ul className={LEVEL_2_LIST}>
									{room.entries.map((entry) => (
										<li key={entry.id}>
											<SidebarItem
												href={`/${repo}/inventory/${entry.slug}`}
												current={entry.slug === entrySlug}
												className={LEVEL_2_ITEM}
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

function BatchTree({
	groups,
	repo,
	batchSlug,
}: {
	groups: BatchGroup<Batch>[];
	repo: string | undefined;
	batchSlug: string | undefined;
}) {
	if (groups.length === 0) {
		return <p className="px-2 py-2 text-sm text-foreground-muted">No batches found.</p>;
	}

	return (
		<ul role="tree" aria-label="Batches by composition" className="space-y-2">
			{groups.map((material) => (
				<li key={material.name ?? "unassigned-material"} role="treeitem" aria-expanded="true">
					<div className={`${GROUP_ROW} text-sm font-semibold text-foreground`}>
						<BeakerIcon className="size-4 shrink-0 text-foreground-muted" />
						<span className="truncate">{material.name ?? "No active material"}</span>
					</div>

					<ul role="group" className={LEVEL_1_LIST}>
						{material.supports.map((support) => (
							<li key={support.name ?? "unassigned-support"} role="treeitem" aria-expanded="true">
								<div
									className={`${GROUP_ROW} ${LEVEL_1_ROW} text-xs font-medium text-foreground-muted`}
								>
									{support.name ?? "No support"}
								</div>

								<ul role="group" className={LEVEL_2_LIST}>
									{support.batches.map((batch) => (
										<li key={batch.id} role="treeitem">
											<SidebarItem
												href={`/${repo}/samples/${batch.slug}`}
												current={batch.slug === batchSlug}
												className={LEVEL_2_ITEM}
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

export function AppLayout({
	repository,
	sidebarWidth,
	buildings,
	batchGroups,
	children,
}: {
	/**
	 * The slug of the repository in scope.
	 */
	repository: string;

	/**
	 * The width sent with this request. The first page drawn is already right.
	 */
	sidebarWidth: number;
	buildings: Building<Entry>[];
	batchGroups: BatchGroup<Batch>[];
	children: ReactNode;
}) {
	const { pathname } = useLocation();
	const { repo, entrySlug, batchSlug } = useParams();

	const title = repository;
	const section = sidebarSection(pathname, repository);

	return (
		<SidebarLayout
			sidebarWidth={sidebarWidth}
			sidebar={
				<Sidebar>
					{/* Top zone: the same on every page of the repository. */}
					<SidebarHeader>
						<SidebarHeading>{title}</SidebarHeading>

						{/*
							The repository name says where the work happens. The links below
							say what can be opened there. A line separates the two.
						*/}
						<SidebarDivider className="-mx-4" />

						<SidebarSection>
							<SidebarItem href={`/${repo}/catalog`} current={section === "catalog"}>
								<BookOpenIcon />
								<SidebarLabel>Catalog</SidebarLabel>
							</SidebarItem>
							<SidebarItem href={`/${repo}/inventory`} current={section === "inventory"}>
								<ArchiveBoxIcon />
								<SidebarLabel>Inventory</SidebarLabel>
							</SidebarItem>
							<SidebarItem href={`/${repo}/samples`} current={section === "samples"}>
								<BeakerIcon />
								<SidebarLabel>Samples</SidebarLabel>
							</SidebarItem>
							<SidebarItem href={`/${repo}/files/import`} current={section === "files"}>
								<ArrowUpTrayIcon />
								<SidebarLabel>Import files</SidebarLabel>
							</SidebarItem>
						</SidebarSection>
					</SidebarHeader>

					{/* Middle zone: the tree of the section in view. */}
					<SidebarBody>
						{section === "inventory" && (
							<SidebarSection>
								<SidebarItem href={`/${repo}/inventory`} current={!entrySlug}>
									<SidebarLabel>All entries</SidebarLabel>
								</SidebarItem>
								<LocationTree buildings={buildings} repo={repo} entrySlug={entrySlug} />
							</SidebarSection>
						)}

						{section === "samples" && (
							<SidebarSection>
								<SidebarItem href={`/${repo}/samples`} current={pathname === `/${repo}/samples`}>
									<SidebarLabel>All samples</SidebarLabel>
								</SidebarItem>
								<BatchTree groups={batchGroups} repo={repo} batchSlug={batchSlug} />
								<SidebarItem
									href={`/${repo}/samples/new`}
									current={pathname === `/${repo}/samples/new`}
								>
									<PlusIcon />
									<SidebarLabel>Create batch</SidebarLabel>
								</SidebarItem>
							</SidebarSection>
						)}
					</SidebarBody>

					{/* Bottom zone. The manual is not scoped to a repository, so it sits apart. */}
					<SidebarFooter>
						<SidebarSection>
							<SidebarItem href="/docs" current={pathname.startsWith("/docs")}>
								<AcademicCapIcon />
								<SidebarLabel>User manual</SidebarLabel>
							</SidebarItem>
						</SidebarSection>
					</SidebarFooter>
				</Sidebar>
			}
			navbar={
				<Navbar>
					<NavbarSection>{title}</NavbarSection>
					<NavbarSpacer />
				</Navbar>
			}
		>
			{children}
		</SidebarLayout>
	);
}
