/**
 * Application shell for a single repository.
 *
 * Every section is a heading in the sidebar. Inventory expands into a
 * Building -> Room -> Entry tree; Catalog and Samples are plain links until
 * they grow their own navigation.
 */
import { BuildingOffice2Icon, CubeIcon, RectangleGroupIcon } from "@heroicons/react/20/solid";
import type { ReactNode } from "react";
import { useLocation, useParams } from "react-router";

import type { Building, InventoryKind, Repository } from "~/app/data/types";
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
import { SidebarLayout } from "~/catalyst-ui/sidebar-layout";

/**
 * Custom rigs carry a P&ID; standalone equipment does not.
 */
function KindIcon({ kind }: { kind: InventoryKind }) {
	return kind === "rig" ? <RectangleGroupIcon /> : <CubeIcon />;
}

function LocationTree({
	buildings,
	repo,
	entryId,
}: {
	buildings: Building[];
	repo: string | undefined;
	entryId: string | undefined;
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
												href={`/${repo}/inventory/${entry.id}`}
												current={String(entry.id) === entryId}
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

export function AppLayout({
	repository,
	buildings,
	children,
}: {
	repository: Repository;
	buildings: Building[];
	children: ReactNode;
}) {
	const { pathname } = useLocation();
	const { repo, entryId } = useParams();

	const title = repository.name;

	const isCurrent = (segment: string) => {
		const href = `/${repo}/${segment}`;
		return pathname === href || pathname.startsWith(`${href}/`);
	};

	return (
		<SidebarLayout
			sidebar={
				<Sidebar>
					<SidebarHeader>
						<SidebarHeading>{title}</SidebarHeading>
					</SidebarHeader>

					<SidebarBody>
						<SidebarHeading>Inventory</SidebarHeading>
						<SidebarSection>
							<SidebarItem href={`/${repo}/inventory`} current={isCurrent("inventory") && !entryId}>
								<SidebarLabel>All entries</SidebarLabel>
							</SidebarItem>
							<LocationTree buildings={buildings} repo={repo} entryId={entryId} />
						</SidebarSection>

						<SidebarHeading className="mt-6">Catalog</SidebarHeading>
						<SidebarSection>
							<SidebarItem href={`/${repo}/catalog`} current={isCurrent("catalog")}>
								<SidebarLabel>Manufacturers</SidebarLabel>
							</SidebarItem>
						</SidebarSection>

						<SidebarHeading className="mt-6">Samples</SidebarHeading>
						<SidebarSection>
							<SidebarItem href={`/${repo}/samples`} current={isCurrent("samples")}>
								<SidebarLabel>All samples</SidebarLabel>
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
