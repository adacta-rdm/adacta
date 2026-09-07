import { Outlet } from "react-router";

/**
 * Pathless frame for /docs/:slug. It exists only so the slug page (docs.$slug)
 * can be an index route beneath it: that gives the leaf react-router's
 * index-route score bonus, which is what lets /docs/* outrank index application
 * routes such as $repo.catalog._index at /:repo/catalog. See app/routes.ts for
 * the full explanation.
 */
export default function DocsSlugFrame() {
	return <Outlet />;
}
