import Markdoc, { type RenderableTreeNode } from "@markdoc/markdoc";
// js-yaml 5.x is ESM with named exports only (no default export, unlike 4.x
// which the upstream template imported as `import yaml from "js-yaml"`).
import { load as parseYaml } from "js-yaml";

import { collectSections, type TocSection } from "~/app/lib/docs/collectSections";
import { markdocConfig } from "~/app/lib/docs/markdocSchema";

/**
 * Frontmatter parsed from a doc's leading YAML block. Only `title` is used by
 * the pipeline today; the index signature keeps arbitrary authoring keys (e.g.
 * the template's `nextjs.metadata`) from failing the type without forcing us to
 * model fields we do not yet consume.
 */
export interface DocFrontmatter {
	title?: string;
	[key: string]: unknown;
}

/**
 * A doc compiled to its render-ready form. `content` is a Markdoc
 * RenderableTreeNode, which is a plain-object tree (no class instances): it
 * survives react-router's loader serialization and renders identically on
 * server and client via `Markdoc.renderers.react`.
 */
export interface TransformedDoc {
	content: RenderableTreeNode;
	frontmatter: DocFrontmatter;
	/**
	 * The h2/h3 table of contents, computed server-side from the transformed
	 * tree so it ships to the client ready to render (the "On this page" nav).
	 */
	sections: TocSection[];
}

/**
 * Compile a raw markdown string into a serializable render tree plus its
 * frontmatter. This is the seam the whole docs subsystem is built on: it runs
 * in a route loader (server-side), and its output is handed to the component
 * unchanged. Keeping parse/transform here — rather than in the route — means
 * the Markdoc schema has one home as it grows.
 */
export function transformDoc(markdown: string): TransformedDoc {
	const ast = Markdoc.parse(markdown);
	const frontmatter = (
		ast.attributes.frontmatter ? parseYaml(ast.attributes.frontmatter) : {}
	) as DocFrontmatter;
	const content = Markdoc.transform(ast, markdocConfig);
	const sections = collectSections(content);
	return { content, frontmatter, sections };
}
