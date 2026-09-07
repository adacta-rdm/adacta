/**
 * Shared search configuration, imported by both the Node build step
 * (buildDocsSearchIndex) and the client (searchIndex). It holds only plain data
 * and types — no FlexSearch or Markdoc imports — so it is safe to pull into the
 * Vite plugin's build context.
 *
 * The FlexSearch options must be identical on both sides: the client rehydrates
 * the index with `Document.import`, and import only matches an index that was
 * built under the same tokenizer/context/field configuration.
 */

/**
 * A search hit handed to the UI. `url` is the route plus heading anchor;
 * `pageTitle` is the owning page's title for a sub-section hit (undefined when
 * the hit is the page itself).
 */
export interface SearchResult {
	url: string;
	title: string;
	pageTitle?: string;
}

/**
 * Display metadata for one indexed url. Shipped alongside the serialized index
 * so the client can turn a result id (url) into something to render without
 * relying on FlexSearch's store surviving export/import.
 */
export interface SearchMeta {
	title: string;
	pageTitle?: string;
}

/**
 * The payload the build step produces and the client consumes: the serialized
 * FlexSearch shards (keyed blobs from `Document.export`) plus the url→metadata
 * map. This is the shape of the `virtual:docs-search-index` module.
 */
export interface SearchIndexData {
	shards: Record<string, string>;
	meta: Record<string, SearchMeta>;
}

/**
 * FlexSearch Document options. `full` tokenization indexes all substrings for
 * forgiving partial matches; the context options bias ranking toward terms that
 * appear near each other. Only `content` is indexed; the id is the url. No
 * `store` — display data travels in the separate meta map instead.
 */
export const searchDocumentOptions = {
	tokenize: "full",
	document: { id: "url", index: ["content"] },
	context: { resolution: 9, depth: 2, bidirectional: true },
} as const;
