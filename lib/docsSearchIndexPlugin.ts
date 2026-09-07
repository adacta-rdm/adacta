/** Provides the generated docs search index to Vite as a virtual module. */
import { execFileSync } from "node:child_process";
import * as path from "node:path";

import type { Plugin, ViteDevServer } from "vite";

/**
 * Vite plugin that serves the docs search index as a virtual module. The index
 * is built in Node (see app/lib/docs/buildDocsSearchIndex) at build/dev time and
 * emitted here as serialized FlexSearch shards plus a url→metadata map. The
 * browser imports this module and only rehydrates it — no Markdoc parse, no
 * tokenization, and no raw markdown shipped to the client for search.
 *
 * The builder runs in a bun child process rather than being imported directly:
 * it depends on app modules via the "~" tsconfig alias, which Node cannot
 * resolve once Vite bundles this config to plain ESM, whereas bun resolves it.
 * Running out-of-process keeps vite.config free of "~" imports and works the
 * same in dev and in the production build.
 *
 * In dev, editing any doc invalidates the module and triggers a reload so the
 * index reflects the change without restarting the server.
 */
const VIRTUAL_ID = "virtual:docs-search-index";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

export function docsSearchIndexPlugin(): Plugin {
	let root: string;
	const contentDir = () => path.resolve(root, "app/docs");

	return {
		name: "docs-search-index",

		configResolved(config) {
			root = config.root;
		},

		resolveId(id) {
			if (id === VIRTUAL_ID) return RESOLVED_ID;
		},

		load(id) {
			if (id !== RESOLVED_ID) return;
			const script = path.resolve(root, "app/lib/docs/scripts/printSearchIndex.ts");
			// stdout is the JSON payload; bun's own diagnostics go to stderr and are
			// not captured, so the parse stays clean.
			const json = execFileSync("bun", [script, contentDir()], {
				encoding: "utf8",
				maxBuffer: 64 * 1024 * 1024,
			});
			const { shards, meta } = JSON.parse(json);
			return (
				`export const shards = ${JSON.stringify(shards)};\n` +
				`export const meta = ${JSON.stringify(meta)};\n`
			);
		},

		configureServer(server: ViteDevServer) {
			server.watcher.on("all", (_event, file) => {
				if (!file.startsWith(contentDir()) || !file.endsWith(".md")) return;
				const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
				if (mod) {
					server.moduleGraph.invalidateModule(mod);
					server.ws.send({ type: "full-reload" });
				}
			});
		},
	};
}
