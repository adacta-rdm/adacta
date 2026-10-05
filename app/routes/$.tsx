/**
 * An unknown address is reported inside the application layout.
 * The reader therefore keeps the sidebar and can open another page.
 */
import type { Route } from "./+types/$.ts";

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

export function loader({ params }: Route.LoaderArgs) {
	const path = params["*"] ?? "";

	throw new Response(`There is no page at "/${path}".`, { status: 404 });
}
