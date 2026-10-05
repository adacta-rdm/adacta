import Markdoc, { type Config } from "@markdoc/markdoc";
import * as React from "react";

import { Prose } from "~/app/components/docs/Prose.tsx";

const { nodes: defaultNodes, Tag } = Markdoc;

/**
 * The restricted Markdown vocabulary used for notes.
 *
 * Raw HTML stays text. Markdoc tags are escaped before parsing. Images become
 * their alternative text, because note files are shown as attachments.
 */
const noteConfig = {
	nodes: {
		document: { ...defaultNodes.document, render: "div" },
		softbreak: { render: "br" },
		image: {
			...defaultNodes.image,
			transform(node) {
				return typeof node.attributes.alt === "string" ? node.attributes.alt : "";
			},
		},
		code: {
			...defaultNodes.code,
			transform(node, config) {
				const attributes = node.transformAttributes(config);
				return new Tag("code", attributes, [restoreMarkdocTags(node.attributes.content)]);
			},
		},
		link: {
			...defaultNodes.link,
			attributes: {
				...defaultNodes.link.attributes,
				target: { type: String, default: "_blank" },
				rel: { type: String, default: "noopener noreferrer" },
			},
		},
		fence: {
			...defaultNodes.fence,
			transform(node, config) {
				const attributes = node.transformAttributes(config);
				const code = new Tag("code", {}, [restoreMarkdocTags(node.attributes.content)]);
				return new Tag("pre", attributes, [code]);
			},
		},
	},
	tags: {},
} satisfies Config;

/**
 * Show a note as safe, restricted Markdown without changing its stored text.
 */
export function NoteMarkdown({ body }: { body: string }) {
	const escapedTags = body.replaceAll("{%", "\\{%");
	const content = Markdoc.transform(Markdoc.parse(escapedTags), noteConfig);

	return (
		<Prose className="prose-sm prose-headings:my-3 prose-headings:text-sm prose-headings:leading-6 prose-headings:font-semibold prose-p:my-2 prose-pre:my-3 first:*:mt-0 last:*:mb-0">
			{Markdoc.renderers.react(content, React)}
		</Prose>
	);
}

function restoreMarkdocTags(value: unknown): string {
	return typeof value === "string" ? value.replaceAll("\\{%", "{%") : "";
}
