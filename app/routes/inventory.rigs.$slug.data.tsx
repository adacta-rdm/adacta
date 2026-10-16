import { Outlet } from "react-router";

import type { BreadcrumbHandle } from "~/app/components/PageBreadcrumbs.tsx";

export const handle = { breadcrumb: "Data" } satisfies BreadcrumbHandle;

/**
 * Provides the list of imported datasets for a rig.
 */
export default function InventoryRigsSlugData() {
	return <Outlet />;
}
