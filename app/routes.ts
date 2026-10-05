import { layout, type RouteConfig } from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";

/**
 * Application pages share authentication and the sidebar.
 * Login, the authentication API, and the manual are declared outside that layout.
 * The manual's /docs/:slug path has its own prefix. Hence, it no longer competes
 * with application paths such as /catalog.
 */
const routes = await flatRoutes({ ignoredRouteFiles: ["routes/_app.tsx"] });
const publicFiles = new Set(["routes/login.tsx", "routes/api.auth.$.ts", "routes/docs.tsx"]);

export default [
	...routes.filter((entry) => publicFiles.has(entry.file)),
	layout(
		"routes/_app.tsx",
		routes.filter((entry) => !publicFiles.has(entry.file)),
	),
] satisfies RouteConfig;
