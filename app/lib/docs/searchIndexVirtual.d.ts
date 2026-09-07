/**
 * Type for the build-time-generated search index module. The module itself is
 * produced by the Vite plugin in lib/docsSearchIndexPlugin.ts; this declaration
 * gives its `shards` and `meta` exports the shapes defined in searchConfig.
 */
declare module "virtual:docs-search-index" {
	import type { SearchIndexData } from "~/app/lib/docs/searchConfig.ts";

	export const shards: SearchIndexData["shards"];
	export const meta: SearchIndexData["meta"];
}
