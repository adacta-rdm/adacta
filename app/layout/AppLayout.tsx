/**
 * Application shell shared by every section.
 *
 * The sidebar is split into three zones. The top zone holds the application
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
	UserGroupIcon,
} from "@heroicons/react/20/solid";
import type { ReactNode } from "react";
import { useLocation } from "react-router";

import { SidebarLayout } from "~/app/layout/SidebarLayout.tsx";
import type { LeftSidebar, RightSidebar } from "~/app/layout/routeSidebar.ts";
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

const COLLAPSED_SIDEBAR_ITEM = "[&>a]:justify-center [&>a]:gap-0";

export function AppLayout({
	sidebarWidth,
	sidebarCollapsed,
	leftSidebar,
	rightSidebar,
	children,
}: {
	/**
	 * The width sent with this request. The first page drawn is already right.
	 */
	sidebarWidth: number;
	sidebarCollapsed: boolean;
	leftSidebar?: LeftSidebar;
	rightSidebar?: RightSidebar;
	children: ReactNode;
}) {
	const { pathname } = useLocation();

	const title = "Adacta";
	const section = sidebarSection(pathname);
	const LeftSidebarContent = leftSidebar;

	return (
		<SidebarLayout
			sidebarWidth={sidebarWidth}
			sidebarCollapsed={sidebarCollapsed}
			rightSidebar={rightSidebar}
			sidebar={(collapsed) => (
				<Sidebar>
					{/* Top zone: the same on every application page. */}
					<SidebarHeader className={collapsed ? "items-center px-3 pt-14" : undefined}>
						{!collapsed ? <SidebarHeading className="pr-8">{title}</SidebarHeading> : null}

						{/*
							The application title and section links occupy separate rows.
						*/}
						{!collapsed ? <SidebarDivider className="-mx-4" /> : null}

						<SidebarSection className={collapsed ? "w-full" : undefined}>
							<SidebarItem
								href={"/catalog"}
								current={section === "catalog"}
								title={collapsed ? "Catalog" : undefined}
								className={collapsed ? COLLAPSED_SIDEBAR_ITEM : undefined}
							>
								<BookOpenIcon />
								<SidebarLabel className={collapsed ? "sr-only" : undefined}>Catalog</SidebarLabel>
							</SidebarItem>
							<SidebarItem
								href={"/inventory"}
								current={section === "inventory"}
								title={collapsed ? "Inventory" : undefined}
								className={collapsed ? COLLAPSED_SIDEBAR_ITEM : undefined}
							>
								<ArchiveBoxIcon />
								<SidebarLabel className={collapsed ? "sr-only" : undefined}>Inventory</SidebarLabel>
							</SidebarItem>
							<SidebarItem
								href={"/samples"}
								current={section === "samples"}
								title={collapsed ? "Samples" : undefined}
								className={collapsed ? COLLAPSED_SIDEBAR_ITEM : undefined}
							>
								<BeakerIcon />
								<SidebarLabel className={collapsed ? "sr-only" : undefined}>Samples</SidebarLabel>
							</SidebarItem>
							<SidebarItem
								href={"/files/import"}
								current={section === "files"}
								title={collapsed ? "Import files" : undefined}
								className={collapsed ? COLLAPSED_SIDEBAR_ITEM : undefined}
							>
								<ArrowUpTrayIcon />
								<SidebarLabel className={collapsed ? "sr-only" : undefined}>
									Import files
								</SidebarLabel>
							</SidebarItem>
							<SidebarItem
								href={"/users"}
								current={section === "users"}
								title={collapsed ? "Users" : undefined}
								className={collapsed ? COLLAPSED_SIDEBAR_ITEM : undefined}
							>
								<UserGroupIcon />
								<SidebarLabel className={collapsed ? "sr-only" : undefined}>Users</SidebarLabel>
							</SidebarItem>
						</SidebarSection>
					</SidebarHeader>

					{/* Middle zone: the tree of the section in view. */}
					<SidebarBody className={collapsed ? "hidden" : undefined}>
						{LeftSidebarContent && <LeftSidebarContent />}
					</SidebarBody>

					{/* Bottom zone: the user manual. */}
					<SidebarFooter className={collapsed ? "px-3" : undefined}>
						<SidebarSection>
							<SidebarItem
								href="/docs"
								current={pathname.startsWith("/docs")}
								title={collapsed ? "User manual" : undefined}
								className={collapsed ? COLLAPSED_SIDEBAR_ITEM : undefined}
							>
								<AcademicCapIcon />
								<SidebarLabel className={collapsed ? "sr-only" : undefined}>
									User manual
								</SidebarLabel>
							</SidebarItem>
						</SidebarSection>
					</SidebarFooter>
				</Sidebar>
			)}
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
