import { index, route, type RouteConfig } from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";

/**
 * We declare the docs routes before the file-system routes because
 * /docs/:slug and routes such as /:repo/catalog get the same React Router
 * score. Since they aren't siblings, declaration order breaks the tie. Keeping
 * docs first means /docs/catalog opens the doc instead of the catalog route.
 *
 * We also put the slug page in an index route under the ":slug" frame. The
 * index bonus keeps it from losing to an application index route with the same
 * shape, such as $repo.catalog._index.
 */
const docs = route("docs", "routes/docs.tsx", [
	index("routes/docs._index.tsx"),
	route(":slug", "routes/docsSlugFrame.tsx", [index("routes/docs.$slug.tsx")]),
]);

export default [
	docs,
	...(await flatRoutes({
		// These four are declared above. Naming them here keeps the file-system
		// scan from declaring them a second time.
		ignoredRouteFiles: [
			"routes/docs.tsx",
			"routes/docs._index.tsx",
			"routes/docs.$slug.tsx",
			"routes/docsSlugFrame.tsx",
		],
	})),
] satisfies RouteConfig;
