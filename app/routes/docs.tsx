import { Outlet } from "react-router";

import { DocsShell } from "~/app/components/docs/DocsShell.tsx";

/**
 * Layout route for the whole /docs subsystem. flatRoutes nests docs._index and
 * docs.$slug under this file, so the shell (header + sidebar) renders once and
 * the routed page fills the <Outlet />.
 */
export default function DocsRoot() {
	return (
		<DocsShell>
			<Outlet />
		</DocsShell>
	);
}
