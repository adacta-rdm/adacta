import * as fs from "node:fs";
import * as path from "node:path";

import type { RenderableTreeNode } from "@markdoc/markdoc";
import { Document } from "flexsearch";

import {
	searchDocumentOptions,
	type SearchIndexData,
	type SearchMeta,
} from "~/app/lib/docs/searchConfig";
import { transformDoc } from "~/app/lib/docs/transformDoc";

/**
 * Builds the docs search index in Node at build time and serializes it. The
 * Vite plugin calls this and emits the result as the `virtual:docs-search-index`
 * module; the browser only rehydrates it (no Markdoc, no tokenization, no raw
 * markdown shipped for search). See searchIndex.ts for the client side.
 *
 * This runs where Markdoc does, so its dependency chain (transformDoc ->
 * markdocSchema) must stay free of React components. docsComponents.ts holds
 * those separately, so this build step does not include the component tree.
 */

/**
 * Minimal render-tree tag shape (the transformed Markdoc output is a plain
 * object tree). Mirrors collectSections; avoids importing Markdoc's Tag class.
 */
interface RenderTag {
	name: string;
	attributes: Record<string, unknown>;
	children: RenderableTreeNode[];
}

function isTag(node: RenderableTreeNode): node is RenderableTreeNode & RenderTag {
	return typeof node === "object" && node !== null && "name" in node && "children" in node;
}

/**
 * All text descended from a node, for a heading title or body prose.
 */
function textOf(node: RenderableTreeNode): string {
	if (typeof node === "string") return node;
	if (isTag(node)) return node.children.map(textOf).join("");
	return "";
}

/**
 * The route a doc slug is served at. The Introduction is the docs landing at
 * /docs (see docs._index.tsx and navigation.ts), so its hits point there rather
 * than /docs/introduction, which keeps search urls consistent with the
 * navigation.
 */
function slugToUrl(slug: string): string {
	return slug === "introduction" ? "/docs" : `/docs/${slug}`;
}

/**
 * One indexed unit before serialization: the searchable text (`content`) keyed
 * by `url`, plus the display metadata that will travel in the meta map.
 */
interface IndexedSection {
	url: string;
	content: string;
	meta: SearchMeta;
}

/**
 * Splits a doc into searchable sections: one entry for the page as a whole plus
 * one per top-level h2. Prose between headings is appended to the section it
 * belongs to. Section anchors are read from the transformed tree's heading ids,
 * so they always match the anchors the page renders. h3+ text is merged into its
 * parent h2 section.
 */
function sectionsForDoc(slug: string, markdown: string): IndexedSection[] {
	const { content, frontmatter } = transformDoc(markdown);
	const url = slugToUrl(slug);
	const pageTitle = frontmatter.title ?? slug;

	const sections: IndexedSection[] = [{ url, content: pageTitle, meta: { title: pageTitle } }];
	let current = sections[0];

	const blocks = isTag(content) ? content.children : [];
	for (const node of blocks) {
		if (isTag(node) && node.name === "h2") {
			const id = typeof node.attributes.id === "string" ? node.attributes.id : "";
			const title = textOf(node).trim();
			current = {
				url: id ? `${url}#${id}` : url,
				content: title,
				meta: { title, pageTitle },
			};
			sections.push(current);
		} else {
			const text = textOf(node).trim();
			if (text) current.content += "\n" + text;
		}
	}

	return sections;
}

/**
 * Reads every `*.md` under `contentDir`, indexes it, and returns the serialized
 * FlexSearch shards plus the url→metadata map. The async export handler is used
 * so the returned promise resolves only once every shard has been collected.
 */
export async function buildDocsSearchIndex(contentDir: string): Promise<SearchIndexData> {
	// FlexSearch's Document generics are unwieldy; the options are validated by
	// the shared searchConfig, so cast at construction.
	const index = new Document(searchDocumentOptions as never);
	const meta: Record<string, SearchMeta> = {};

	const files = fs
		.readdirSync(contentDir)
		.filter((file) => file.endsWith(".md"))
		.sort(); // stable order -> stable shard output across builds

	for (const file of files) {
		const slug = file.replace(/\.md$/, "");
		const markdown = fs.readFileSync(path.join(contentDir, file), "utf8");
		for (const section of sectionsForDoc(slug, markdown)) {
			index.add({ url: section.url, content: section.content });
			meta[section.url] = section.meta;
		}
	}

	const shards: Record<string, string> = {};
	index.export(async (key: string, data: string) => {
		shards[key] = data;
	});

	return { shards, meta };
}
