/**
 * Any address inside a repository that names no page.
 *
 * Without this route the address matches nothing, and React Router reports it
 * at the root. The repository layout is then not rendered and the sidebar is
 * gone. Throwing here puts the report inside the layout, so the reader keeps
 * the sidebar and can navigate away.
 */
import type { Route } from "./+types/$repo.$";

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary";

export function loader({ params }: Route.LoaderArgs) {
	const path = params["*"] ?? "";

	throw new Response(`There is no page at "${params.repo}/${path}".`, { status: 404 });
}
