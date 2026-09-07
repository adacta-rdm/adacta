import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

import { docsSearchIndexPlugin } from "./lib/docsSearchIndexPlugin.ts";

export default defineConfig({
	define: {
		"import.meta.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
	},
	plugins: [tailwindcss(), reactRouter(), docsSearchIndexPlugin()],
	resolve: {
		tsconfigPaths: true,
	},
});
