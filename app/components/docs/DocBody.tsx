import Markdoc, { type RenderableTreeNode } from "@markdoc/markdoc";
import * as React from "react";

import { docsComponents } from "~/app/lib/docs/docsComponents.ts";

/**
 * Renders a transformed Markdoc tree to React elements, resolving the schema's
 * string `render` names (Fence, Callout, ...) via the docsComponents map. Shared
 * by the index and slug routes so the render call exists in one place.
 */
export function DocBody({ content }: { content: RenderableTreeNode }) {
	return <>{Markdoc.renderers.react(content, React, { components: docsComponents })}</>;
}
