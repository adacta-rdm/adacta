/**
 * The sidebar has a fixed top zone and a middle zone that changes with the
 * section in view. This module names the section for a path.
 *
 * For example, "/inventory/rig-1" is in the "inventory" section.
 * The root and unknown segments belong to no section.
 */

export const SIDEBAR_SECTIONS = ["catalog", "inventory", "samples", "files", "users"] as const;

export type SidebarSection = (typeof SIDEBAR_SECTIONS)[number];

export function sidebarSection(pathname: string): SidebarSection | undefined {
	const segment = pathname.split("/")[1];

	return SIDEBAR_SECTIONS.find((section) => section === segment);
}
