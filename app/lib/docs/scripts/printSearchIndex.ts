import { buildDocsSearchIndex } from "~/app/lib/docs/buildDocsSearchIndex";

/**
 * Prints the serialized docs search index as JSON to stdout. Invoked by the
 * Vite plugin (lib/docsSearchIndexPlugin) in a bun child process, which is what
 * lets the "~" import alias in the builder chain resolve. argv[2] is the
 * docs directory to index.
 *
 * Only JSON is written to stdout; anything else would corrupt the payload the
 * plugin parses.
 */
const contentDir = process.argv[2];

void buildDocsSearchIndex(contentDir).then((data) => {
	process.stdout.write(JSON.stringify(data));
});
