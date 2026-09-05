import { Outlet } from "react-router";

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary";

export function meta() {
	return [{ title: "Catalog — Adacta" }];
}

/**
 * Provides the page content selected within the catalog section.
 */
export default function Catalog() {
	return <Outlet />;
}
