import { Document } from "flexsearch";
import { meta, shards } from "virtual:docs-search-index";

import { searchDocumentOptions, type SearchResult } from "~/app/lib/docs/searchConfig.ts";

export type { SearchResult } from "~/app/lib/docs/searchConfig.ts";

/**
 * Client-side docs search. The index itself is built in Node at build time
 * (see ../../../lib/docsSearchIndexPlugin and buildDocsSearchIndex) and is
 * delivered to the browser as the `virtual:docs-search-index` module: serialized
 * FlexSearch shards plus a url→metadata map. This module only rehydrates and
 * queries them; no Markdoc, no markdown, and no tokenization run in the browser.
 */

/**
 * The rehydrated FlexSearch index, built lazily on first search from the
 * serialized shards. `Document.import` reconstructs the index under the same
 * config it was exported with (searchDocumentOptions), which is why that config
 * is shared between the build step and here.
 */
let index: ReturnType<typeof rehydrate> | undefined;

function rehydrate() {
	// FlexSearch's Document generics are unwieldy; the shared searchConfig is the
	// source of truth for the options, so cast at construction.
	const doc = new Document(searchDocumentOptions as never);
	for (const [key, data] of Object.entries(shards)) {
		doc.import(key, data);
	}
	return doc;
}

/**
 * Shape of a non-enriched Document.search result: one group per indexed field,
 * each a list of matching ids (urls). Display data comes from the meta map, not
 * from a FlexSearch store, so enrichment is not requested.
 */
type ResultGroup = { result: string[] };

/**
 * Runs a query against the docs index, returning up to `limit` hits. Result ids
 * (urls) are mapped to titles via the shipped meta map and de-duplicated (one
 * field means one group today; merging keeps it correct if fields grow).
 */
export function search(query: string, limit = 8): SearchResult[] {
	if (!query.trim()) return [];
	index ??= rehydrate();

	const groups = index.search(query, { limit }) as unknown as ResultGroup[];

	const seen = new Set<string>();
	const results: SearchResult[] = [];
	for (const group of groups) {
		for (const id of group.result) {
			const url = String(id);
			if (seen.has(url)) continue;
			seen.add(url);
			const entry = meta[url];
			results.push({ url, title: entry?.title ?? "", pageTitle: entry?.pageTitle });
		}
	}

	return results.slice(0, limit);
}
