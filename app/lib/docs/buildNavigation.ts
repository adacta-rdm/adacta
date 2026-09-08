/**
 * Turns the authored section list into the links the docs sidebar renders.
 *
 * A documentation author writes an ordered list of slugs. The title of each
 * link is then read from the markdown file itself, so a page title is written
 * once. For example, the slug "concepts" becomes a link titled "Core concepts"
 * pointing at /docs/concepts.
 *
 * This module holds no file access and no build-time data, so the search index
 * builder can import it in Node and the browser bundle stays small.
 */

/**
 * What one doc contributes to the sidebar. `navTitle` is set only by a page
 * whose sidebar label should be shorter than its title.
 */
export interface DocTitle {
	title: string;
	navTitle?: string;
}

/**
 * The authored structure: a named group of docs, in reading order.
 */
export interface DocSection {
	title: string;
	slugs: readonly string[];
}

export interface NavigationLink {
	title: string;
	href: string;
}

export interface NavigationSection {
	title: string;
	links: NavigationLink[];
}

/**
 * The route a doc is served at. The introduction is the docs landing page at
 * /docs. Every other doc is served under its slug, so "tags" is at /docs/tags.
 */
export function docHref(slug: string): string {
	return slug === "introduction" ? "/docs" : `/docs/${slug}`;
}

/**
 * Builds the sidebar sections from the authored order and the titles read from
 * the docs. A slug with no matching doc is labelled with the slug itself. The
 * missing page is then visible in the sidebar rather than silently absent.
 */
export function buildNavigation(
	sections: readonly DocSection[],
	titles: Readonly<Record<string, DocTitle>>,
): NavigationSection[] {
	return sections.map((section) => ({
		title: section.title,
		links: section.slugs.map((slug) => {
			const doc = titles[slug];

			return {
				title: doc?.navTitle ?? doc?.title ?? slug,
				href: docHref(slug),
			};
		}),
	}));
}
