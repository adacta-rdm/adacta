import { Outlet } from "react-router";

import type { BreadcrumbHandle } from "~/app/components/PageBreadcrumbs.tsx";

export const handle = { breadcrumb: "Data" } satisfies BreadcrumbHandle;

/**
 * Provides the list of recordings of a rig and the page of one recording.
 */
export default function InventoryEntrySlugData() {
	return <Outlet />;
}
