import Markdoc, { type Config } from "@markdoc/markdoc";
import { slugifyWithCounter } from "@sindresorhus/slugify";

// @markdoc/markdoc is CommonJS: under Vite SSR its runtime values are only
// reachable through the default export (named imports like `Tag`/`nodes` fail
// to resolve). Type-only named imports (Config) are erased, so they are fine.
const { nodes: defaultNodes, Tag } = Markdoc;

// This file imports no React components by design: the schema references its
// custom components only by render name (the strings below), and the component
// map lives in docsComponents.ts. That keeps markdocConfig, and therefore
// transformDoc, safe to run in the Node build step that generates the search
// index (buildDocsSearchIndex), without including the component tree.

/**
 * Per-render slug counters, keyed by the Markdoc Config object. Headings are
 * transformed in document order, and each render pass gets its own counter so
 * duplicate heading text yields stable, de-duplicated ids (foo, foo-2, ...).
 * Keying on Config isolates concurrent renders (e.g. parallel SSR requests).
 */
const documentSlugifyMap = new Map<Config, ReturnType<typeof slugifyWithCounter>>();

/**
 * Custom Markdoc nodes. Ported from the template's markdoc/nodes.js. The
 * `document` node is intentionally left at its default (renders an <article>);
 * the template wraps it in DocsLayout, which is added when the article chrome
 * lands. Heading ids are needed now so anchors and the future TOC line up.
 */
const nodes = {
	heading: {
		...defaultNodes.heading,
		transform(node, config) {
			let slugify = documentSlugifyMap.get(config);
			// The document node normally seeds the counter; guard so headings still
			// get ids when rendering with the default document node (spike/tests).
			if (!slugify) {
				slugify = slugifyWithCounter();
				documentSlugifyMap.set(config, slugify);
			}
			const attributes = node.transformAttributes(config);
			const children = node.transformChildren(config);
			const text = children.filter((child): child is string => typeof child === "string").join(" ");
			const id = attributes.id ?? slugify(text);

			return new Tag(`h${node.attributes.level}`, { ...attributes, id }, children);
		},
	},
	th: {
		...defaultNodes.th,
		attributes: {
			...defaultNodes.th.attributes,
			scope: {
				type: String,
				default: "col",
			},
		},
	},
	fence: {
		render: "Fence",
		attributes: {
			language: {
				type: String,
			},
		},
	},
} satisfies Config["nodes"];

/**
 * Custom Markdoc tags — the `{% tag %}` authoring vocabulary. Ported from the
 * template's markdoc/tags.js.
 */
const tags = {
	callout: {
		attributes: {
			title: { type: String },
			type: {
				type: String,
				default: "note",
				matches: ["note", "warning"],
				errorLevel: "critical",
			},
		},
		render: "Callout",
	},
	figure: {
		selfClosing: true,
		attributes: {
			src: { type: String },
			alt: { type: String },
			caption: { type: String },
		},
		render: "Figure",
	},
	"quick-links": {
		render: "QuickLinks",
	},
	"quick-link": {
		selfClosing: true,
		render: "QuickLink",
		attributes: {
			title: { type: String },
			description: { type: String },
			icon: { type: String },
			href: { type: String },
		},
	},
} satisfies Config["tags"];

/**
 * The Markdoc config consumed by transformDoc: custom nodes + tags. This is the
 * single home for the docs authoring schema as it grows.
 */
export const markdocConfig = { nodes, tags } satisfies Config;
