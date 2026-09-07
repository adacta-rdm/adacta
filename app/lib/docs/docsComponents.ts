import { Callout } from "~/app/components/docs/Callout";
import { Fence } from "~/app/components/docs/Fence";
import { Figure } from "~/app/components/docs/Figure";
import { QuickLink, QuickLinks } from "~/app/components/docs/QuickLinks";

/**
 * Custom components rendered by the Markdoc schema, keyed by the string names
 * the nodes/tags reference in their `render` field. Passed to
 * `Markdoc.renderers.react` (see DocBody).
 *
 * String render names (not component references) are mandatory in the schema:
 * transform output crosses the react-router loader's JSON serialization
 * boundary, which strips function references. Keeping the names and their
 * components together in this one map guarantees the two sides cannot drift.
 *
 * This lives in its own file, apart from the schema (markdocSchema.ts), so that
 * the schema stays free of React-component imports and can therefore run in a
 * Node build step. The search index is generated there (buildDocsSearchIndex),
 * and it must not include the component tree in the build.
 */
export const docsComponents = {
	Fence,
	Callout,
	Figure,
	QuickLinks,
	QuickLink,
};
