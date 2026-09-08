/** Provides the title of every doc to Vite as a virtual module. */
import * as fs from "node:fs";
import * as path from "node:path";

import Markdoc from "@markdoc/markdoc";
import { load as parseYaml } from "js-yaml";
import type { Plugin, ViteDevServer } from "vite";

/**
 * Vite plugin that reads the frontmatter of every doc and serves the titles as
 * a virtual module. The docs sidebar is built from an authored list of slugs,
 * so a page title is written once, in the markdown file that carries it.
 *
 * Only the titles are emitted, never the prose. The browser therefore receives
 * a few hundred bytes rather than the whole manual.
 *
 * Frontmatter is read with Markdoc, the same parser the pages are rendered
 * with. The sidebar and the page therefore always agree on a title.
 *
 * In dev, editing a doc invalidates the module and triggers a reload, so a
 * renamed page reaches the sidebar without restarting the server.
 */
const VIRTUAL_ID = "virtual:docs-titles";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

interface DocTitle {
	title: string;
	navTitle?: string;
}

/**
 * Reads `title` and the optional `navTitle` from each markdown file in the
 * directory, keyed by slug. A file without a title is left out, so the slug
 * stands in for it in the sidebar.
 */
function readDocTitles(contentDir: string): Record<string, DocTitle> {
	const titles: Record<string, DocTitle> = {};

	const files = fs
		.readdirSync(contentDir)
		.filter((file) => file.endsWith(".md"))
		.sort(); // stable order -> stable module output across builds

	for (const file of files) {
		const markdown = fs.readFileSync(path.join(contentDir, file), "utf8");
		const ast = Markdoc.parse(markdown);
		const frontmatter = (
			ast.attributes.frontmatter ? parseYaml(ast.attributes.frontmatter) : {}
		) as DocTitle;

		if (typeof frontmatter.title !== "string") continue;

		const slug = file.replace(/\.md$/, "");
		titles[slug] =
			typeof frontmatter.navTitle === "string"
				? { title: frontmatter.title, navTitle: frontmatter.navTitle }
				: { title: frontmatter.title };
	}

	return titles;
}

export function docsTitlesPlugin(): Plugin {
	let root: string;
	const contentDir = () => path.resolve(root, "app/docs");

	return {
		name: "docs-titles",

		configResolved(config) {
			root = config.root;
		},

		resolveId(id) {
			if (id === VIRTUAL_ID) return RESOLVED_ID;
		},

		load(id) {
			if (id !== RESOLVED_ID) return;
			return `export const titles = ${JSON.stringify(readDocTitles(contentDir()))};\n`;
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
