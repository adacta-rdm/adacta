/**
 * Types for the build-time-generated docs modules. Each is produced by a Vite
 * plugin in lib/; these declarations give their exports the shapes the app
 * code expects.
 */
declare module "virtual:docs-search-index" {
	import type { SearchIndexData } from "~/app/lib/docs/searchConfig.ts";

	export const shards: SearchIndexData["shards"];
	export const meta: SearchIndexData["meta"];
}

declare module "virtual:docs-titles" {
	import type { DocTitle } from "~/app/lib/docs/buildNavigation.ts";

	/**
	 * The title of every doc, keyed by slug. Produced by
	 * lib/docsTitlesPlugin.ts from the frontmatter of app/docs/*.md.
	 */
	export const titles: Record<string, DocTitle>;
}
