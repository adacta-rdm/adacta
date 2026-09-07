import { DocBody } from "~/app/components/docs/DocBody";
import { DocsLayout } from "~/app/components/docs/DocsLayout";
import { loadDoc } from "~/app/lib/docs/loadDoc";

import type { Route } from "./+types/docs._index";

/**
 * The docs landing page at /docs. Renders the User Manual's Introduction; the
 * nav's first link ("Introduction") points here. A dedicated route (rather than
 * folding it into docs.$slug) keeps the landing slug an implementation detail
 * the URL does not expose.
 */
export async function loader() {
	return loadDoc("introduction");
}

export default function DocsIndex({ loaderData }: Route.ComponentProps) {
	const { content, frontmatter, sections } = loaderData;
	return (
		<DocsLayout title={frontmatter.title} tableOfContents={sections}>
			<DocBody content={content} />
		</DocsLayout>
	);
}
