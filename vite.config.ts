import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

import { docsSearchIndexPlugin } from "./lib/docsSearchIndexPlugin.ts";
import { docsTitlesPlugin } from "./lib/docsTitlesPlugin.ts";

export default defineConfig({
	define: {
		"import.meta.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
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
