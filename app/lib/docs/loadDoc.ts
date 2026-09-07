import { data } from "react-router";

import { transformDoc, type TransformedDoc } from "~/app/lib/docs/transformDoc.ts";

/**
 * Raw markdown for every doc, keyed by module path. `eager` inlines the strings
 * at build time, so a new doc is just a new file in docs/ — no route wiring, no
 * runtime filesystem access (works under SSR and any bundled deploy target).
 * This is the "author only touches markdown" contract.
 *
 * `import.meta.glob` is a Vite feature (not standard ESM): Vite statically
 * analyzes the glob at build time and generates the imports. It replaces the
 * Next.js template's webpack loader as the file-discovery seam. The glob is
 * relative to this file (app/lib/docs -> ../../docs).
 */
const docModules = import.meta.glob("../../docs/*.md", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

/**
 * Slug -> raw markdown, derived from each file's basename
 * (docs/installation.md -> "installation"). Built once at module load.
 */
const docsBySlug = new Map(
	Object.entries(docModules).map(([path, markdown]) => {
		const slug = path.split("/").pop()!.replace(/\.md$/, "");
		return [slug, markdown];
	}),
);

/**
 * Loads and compiles the doc for a slug, for use in a route loader. A missing
 * slug is a genuine 404 (thrown as a router response), not an app error, so the
 * router renders its not-found boundary rather than crashing.
 */
export function loadDoc(slug: string): TransformedDoc {
	const markdown = docsBySlug.get(slug);
	if (markdown === undefined) {
		throw data(`No doc found for "${slug}"`, { status: 404 });
	}
	return transformDoc(markdown);
}
