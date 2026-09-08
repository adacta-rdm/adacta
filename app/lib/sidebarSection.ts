/**
 * The sidebar has a fixed top zone and a middle zone that changes with the
 * section in view. This module names the section for a path.
 *
 * For example, "/demo/inventory/rig-1" is in the "inventory" section of the
 * "demo" repository. The repository root and unknown segments belong to no
 * section.
 */

export const SIDEBAR_SECTIONS = ["catalog", "inventory", "samples", "files"] as const;

export type SidebarSection = (typeof SIDEBAR_SECTIONS)[number];

export function sidebarSection(pathname: string, repo: string): SidebarSection | undefined {
	const prefix = `/${repo}/`;

	if (!pathname.startsWith(prefix)) {
		return undefined;
	}

	const segment = pathname.slice(prefix.length).split("/")[0];

	return SIDEBAR_SECTIONS.find((section) => section === segment);
}
