/**
 * Application shell for a single repository.
 *
 * Every section is a heading in the sidebar. Inventory expands into a
 * Building -> Room -> Entry tree. Samples expands into an active material ->
 * support -> batch tree.
 */
import {
	ArrowUpTrayIcon,
	BeakerIcon,
	BookOpenIcon,
	BuildingOffice2Icon,
	PlusIcon,
} from "@heroicons/react/20/solid";
import type { ReactNode } from "react";
import { useLocation, useParams } from "react-router";

import { KindIcon, type InventoryKind } from "~/app/components/KindIcon";
import { SidebarLayout } from "~/app/layout/SidebarLayout";
import type { BatchGroup } from "~/app/lib/batchComposition";
import type { Building, Located } from "~/app/lib/location";
import { Navbar, NavbarSection, NavbarSpacer } from "~/catalyst-ui/navbar";
import {
	Sidebar,
	SidebarBody,
	SidebarHeader,
	SidebarHeading,
	SidebarItem,
	SidebarLabel,
	SidebarSection,
} from "~/catalyst-ui/sidebar";
import type { Entity } from "~/drizzle/Schema";

/**
 * What the sidebar tree is built from: a named, placed entry with a kind.
 */
type Entry = Located & { id: number; slug: string; kind: InventoryKind };

type Batch = Pick<Entity<"SampleBatch">, "id" | "slug" | "name" | "activeMaterial" | "support">;

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
					<div className="flex items-center gap-2 px-2 py-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
						<BuildingOffice2Icon className="size-4 shrink-0 text-zinc-500" />
						<span className="truncate">
							{building.identifier ? `Building ${building.identifier}` : "Unassigned"}
						</span>
					</div>

					<ul className="ml-4 border-l border-zinc-200 pl-2 dark:border-zinc-700">
						{building.rooms.map((room) => (
							<li key={room.identifier ?? "unassigned-room"}>
								<div className="px-2 py-1 text-xs font-medium text-zinc-500">
									{room.identifier ? `Room ${room.identifier}` : "Unassigned"}
								</div>

								<ul className="ml-2 border-l border-zinc-100 pl-1 dark:border-zinc-800">
									{room.entries.map((entry) => (
										<li key={entry.id}>
											<SidebarItem
												href={`/${repo}/inventory/${entry.slug}`}
												current={entry.slug === entrySlug}
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
					<div className="flex items-center gap-2 px-2 py-1 text-sm font-semibold text-foreground">
						<BeakerIcon className="size-4 shrink-0 text-foreground-muted" />
						<span className="truncate">{material.name ?? "No active material"}</span>
					</div>

					<ul role="group" className="ml-4 border-l border-border pl-2">
						{material.supports.map((support) => (
							<li key={support.name ?? "unassigned-support"} role="treeitem" aria-expanded="true">
								<div className="px-2 py-1 text-xs font-medium text-foreground-muted">
									{support.name ?? "No support"}
								</div>

								<ul role="group" className="ml-2 border-l border-border pl-1">
									{support.batches.map((batch) => (
										<li key={batch.id} role="treeitem">
											<SidebarItem
												href={`/${repo}/samples/${batch.slug}`}
												current={batch.slug === batchSlug}
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

	const isCurrent = (segment: string) => {
		const href = `/${repo}/${segment}`;
		return pathname === href || pathname.startsWith(`${href}/`);
	};

	return (
		<SidebarLayout
			sidebarWidth={sidebarWidth}
			sidebar={
				<Sidebar>
					<SidebarHeader>
						<SidebarHeading>{title}</SidebarHeading>
					</SidebarHeader>

					<SidebarBody>
						<SidebarHeading>Catalog</SidebarHeading>
						<SidebarSection>
							<SidebarItem href={`/${repo}/catalog`} current={isCurrent("catalog")}>
								<BookOpenIcon />
								<SidebarLabel>Browse the catalog</SidebarLabel>
							</SidebarItem>
						</SidebarSection>

						<SidebarHeading className="mt-6">Inventory</SidebarHeading>
						<SidebarSection>
							<SidebarItem
								href={`/${repo}/inventory`}
								current={isCurrent("inventory") && !entrySlug}
							>
								<SidebarLabel>All entries</SidebarLabel>
							</SidebarItem>
							<LocationTree buildings={buildings} repo={repo} entrySlug={entrySlug} />
						</SidebarSection>

						<SidebarHeading className="mt-6">Samples</SidebarHeading>
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

						<SidebarHeading className="mt-6">Data</SidebarHeading>
						<SidebarSection>
							<SidebarItem href={`/${repo}/files/import`} current={isCurrent("files")}>
								<ArrowUpTrayIcon />
								<SidebarLabel>Import files</SidebarLabel>
							</SidebarItem>
						</SidebarSection>
					</SidebarBody>
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
