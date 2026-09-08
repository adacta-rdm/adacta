import { titles } from "virtual:docs-titles";

/**
 * The docs sidebar: named groups of slugs, in reading order.
 *
 * This list and the markdown files are the only things a documentation author
 * edits. Adding a page means creating app/docs/<slug>.md and adding its slug
 * here. The title comes from the file's frontmatter and the route from the
 * slug, so neither is repeated here.
 *
 * A page whose sidebar label should be shorter than its title sets `navTitle`
 * in its frontmatter.
 */
import { buildNavigation, type DocSection } from "~/app/lib/docs/buildNavigation.ts";

export type { NavigationLink, NavigationSection } from "~/app/lib/docs/buildNavigation.ts";

const sections: DocSection[] = [
	{
		title: "User Manual",
		slugs: [
			"introduction",
			"concepts",
			"workflow",
			"catalog",
			"stations",
			"inventory-and-facilities",
			"flowcharts-and-states",
			"tags",
			"samples-and-batches",
			"resources",
			"importing-files",
			"planned-data-import",
			"setup-evidence",
			"importing-data",
			"best-practices",
			"troubleshooting",
		],
	},
];

export const navigation = buildNavigation(sections, titles);
