# Documentation subsystem

The docs are plain Markdown files in `app/docs/`. Each file becomes a page.
`transformDoc.ts` converts the Markdown into a render tree (via Markdoc) that
the route renders. Adding a page requires a Markdown file and one slug in
`navigation.ts`, and nothing further.

## The sidebar

`navigation.ts` holds named groups of slugs, in reading order. It holds nothing
else. A page title is read from the `title` in the file's own frontmatter, and
the route is derived from the slug, so neither is written twice. A page whose
sidebar label should be shorter than its title sets `navTitle` in its
frontmatter as well.

The titles reach the browser as the `virtual:docs-titles` module, built by the
Vite plugin in `../../../lib/docsTitlesPlugin.ts`. The plugin reads frontmatter
with Markdoc, the same parser that renders the pages, so the sidebar and the
page always agree on a title. Only the titles are emitted, never the prose.
In development, editing a doc rebuilds the module automatically.

The files:

- `navigation.ts` — the authored slug list, and the only file besides the
  Markdown that a documentation author edits.
- `buildNavigation.ts` — turns slugs plus titles into sidebar links. It also
  holds `docHref`, the rule that the Introduction is served at `/docs` and every
  other doc under its slug. The search index builder uses the same rule.
- `../../../lib/docsTitlesPlugin.ts` — the Vite plugin that reads frontmatter
  and serves `virtual:docs-titles`.

## Search

Search allows the reader to open any page or section from a `⌘K` / `Ctrl-K`
command palette in the docs header.

**Library.** Two libraries provide this function, both already used elsewhere in
the app:

- **FlexSearch** builds the text index and answers queries. It is a small
  in-memory full-text search engine. Therefore there is no search server and no
  network call. The query runs in the reader's browser against a prebuilt index.
- **Headless UI `Combobox`** provides the palette behavior: the ↑/↓ active-row
  highlight, `aria` wiring, and Enter-to-open. It keeps focus in the input, so
  the behavior is identical in Safari and Chrome. Safari omits links from the
  Tab order, so an approach that relied on Tab would not have worked.

**What gets indexed.** Every page is split into sections, one per `##` heading,
with one additional entry for the page as a whole. The heading text and the
prose beneath it form the searchable content. Each section stores the URL it
lives at, including the heading anchor (for example `/docs/tags#creating-tags`).
The anchors are read from the transformed page, so a search result always links
to an anchor that the page actually renders.

**When indexing happens.** The index is built once at build time, in Node, not
in the browser. A Vite plugin processes the doc set with Markdoc, builds the
FlexSearch index, and serializes it. The result is delivered to the browser as
the `virtual:docs-search-index` module, which contains the serialized FlexSearch
shards and a `url → {title}` map. The browser only rehydrates the index
(`Document.import`) and queries it. It does not parse Markdown, tokenize text, or
download the raw doc prose. In development, editing a Markdown file rebuilds the
index automatically.

The files:

- `buildDocsSearchIndex.ts` — the Node build step (parse, index, serialize).
- `../../../lib/docsSearchIndexPlugin.ts` — the Vite plugin that runs the build
  step and serves the `virtual:docs-search-index` module.
- `searchConfig.ts` — the FlexSearch options and types shared by both sides (the
  index is imported under the same config it was exported with).
- `searchIndex.ts` — the client `search()`: rehydrate the shards, map result
  ids to titles.
- `../components/docs/Search.tsx` — the palette UI.
