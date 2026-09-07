import type { RenderableTreeNode } from "@markdoc/markdoc";

/**
 * A single h3 entry under a section, for the "On this page" table of contents.
 */
export interface TocSubsection {
	id: string;
	title: string;
}

/**
 * A top-level h2 entry with its nested h3 subsections.
 */
export interface TocSection {
	id: string;
	title: string;
	children: TocSubsection[];
}

/**
 * Minimal structural shape of a transformed Markdoc Tag. The transform output
 * is a plain-object tree; this narrows nodes without depending on Markdoc's Tag
 * class (which is awkward to import from the CommonJS build).
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
 * Concatenates all text descended from a node, used to derive a heading's
 * display title (inline formatting like `code` or *em* contributes its text).
 */
function textOf(node: RenderableTreeNode): string {
	if (typeof node === "string") return node;
	if (isTag(node)) return node.children.map(textOf).join("");
	return "";
}

/**
 * Walks a transformed Markdoc tree and builds the table of contents from its
 * h2/h3 headings. Reads each heading's `id` straight from the transformed tree
 * (set by the heading node in the schema), so TOC anchors always match the ids
 * rendered onto the headings — no second, independently-counted slugify pass
 * that could drift from the rendered ids.
 *
 * An h3 with no preceding h2 is promoted to a top-level entry rather than
 * throwing (the template threw): author markdown should not be able to 500 a
 * page over heading order.
 */
export function collectSections(content: RenderableTreeNode): TocSection[] {
	const sections: TocSection[] = [];

	function visit(node: RenderableTreeNode): void {
		if (!isTag(node)) return;

		if (node.name === "h2" || node.name === "h3") {
			const id = typeof node.attributes.id === "string" ? node.attributes.id : "";
			const title = textOf(node).trim();
			if (id && title) {
				const parent = sections[sections.length - 1];
				if (node.name === "h3" && parent) {
					parent.children.push({ id, title });
				} else {
					sections.push({ id, title, children: [] });
				}
			}
		}

		for (const child of node.children) visit(child);
	}

	visit(content);
	return sections;
}
