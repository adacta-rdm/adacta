import { fileURLToPath } from "node:url";

import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

import { docsSearchIndexPlugin } from "./lib/docsSearchIndexPlugin.ts";
import { docsTitlesPlugin } from "./lib/docsTitlesPlugin.ts";
import { readGitCommit } from "./lib/git-commit/readGitCommit.ts";

export default defineConfig({
	define: {
		"import.meta.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
		"import.meta.env.ADACTA_COMMIT": JSON.stringify(
			readGitCommit(fileURLToPath(new URL(".", import.meta.url))),
		),
		"import.meta.env.ADACTA_BUILD_TIME": JSON.stringify(new Date().toISOString()),
	},
	plugins: [tailwindcss(), reactRouter(), docsSearchIndexPlugin(), docsTitlesPlugin()],
	resolve: {
		tsconfigPaths: true,
	},

	server: {
		// Makes a dev container reachable by its host name under OrbStack.
		allowedHosts: [".orb.local"],
	},
});
