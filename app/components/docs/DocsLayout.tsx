import { DocsHeader } from "~/app/components/docs/DocsHeader";
import { PrevNextLinks } from "~/app/components/docs/PrevNextLinks";
import { Prose } from "~/app/components/docs/Prose";
import { TableOfContents } from "~/app/components/docs/TableOfContents";
import type { TocSection } from "~/app/lib/docs/collectSections";

/**
 * The per-page article frame: the doc heading, the prose body, prev/next links,
 * and the right-hand table of contents. Ported from the template's DocsLayout,
 * but the TOC sections are passed in (computed in the loader) rather than
 * derived here from raw AST nodes — the route already has them, and this keeps
 * the untransformed AST out of the serialized loader payload.
 */
export function DocsLayout({
	children,
	title,
	tableOfContents,
}: {
	children: React.ReactNode;
	title?: string;
	tableOfContents: TocSection[];
}) {
	return (
		<>
			<div className="max-w-2xl min-w-0 flex-auto px-4 py-16 lg:max-w-none lg:pr-0 lg:pl-8 xl:px-16">
				<article>
					<DocsHeader title={title} />
					<Prose>{children}</Prose>
				</article>
				<PrevNextLinks />
			</div>
			<TableOfContents tableOfContents={tableOfContents} />
		</>
	);
}
