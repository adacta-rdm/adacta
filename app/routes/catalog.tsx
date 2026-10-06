import { Outlet } from "react-router";

import type { BreadcrumbHandle } from "~/app/components/PageBreadcrumbs.tsx";

export const handle = { breadcrumb: "Catalog" } satisfies BreadcrumbHandle;

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

export function meta() {
	return [{ title: "Catalog — Adacta" }];
}

/**
 * Provides the page content selected within the catalog section.
 */
export default function Catalog() {
	return <Outlet />;
}
