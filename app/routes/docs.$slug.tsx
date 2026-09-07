import { DocBody } from "~/app/components/docs/DocBody.tsx";
import { DocsLayout } from "~/app/components/docs/DocsLayout.tsx";
import { loadDoc } from "~/app/lib/docs/loadDoc.ts";

import type { Route } from "./+types/docs.$slug.ts";

export async function loader({ params }: Route.LoaderArgs) {
	return loadDoc(params.slug);
}

export default function DocPage({ loaderData }: Route.ComponentProps) {
	const { content, frontmatter, sections } = loaderData;
	return (
		<DocsLayout title={frontmatter.title} tableOfContents={sections}>
			<DocBody content={content} />
		</DocsLayout>
	);
}
