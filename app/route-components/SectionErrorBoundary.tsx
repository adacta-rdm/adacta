/**
 * The error boundary every application section exports.
 *
 * React Router renders a boundary in place of the component that owns it and
 * keeps every route above it. A section that owns its boundary is therefore
 * reported inside the application layout. The sidebar stays on screen, and the
 * reader navigates away with it.
 *
 * A route joins in with one line:
 *
 *     export { SectionErrorBoundary as ErrorBoundary } from
 *       "~/app/route-components/SectionErrorBoundary";
 */
import { useRouteError } from "react-router";

import { ErrorPanel } from "~/app/components/ErrorPanel.tsx";

export function SectionErrorBoundary() {
	return <ErrorPanel error={useRouteError()} />;
}
