import { Outlet } from "react-router";

import type { BreadcrumbHandle } from "~/app/components/PageBreadcrumbs.tsx";

export const handle = { breadcrumb: "Inventory" } satisfies BreadcrumbHandle;

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
