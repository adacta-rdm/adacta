import { defineConfig } from "oxfmt";

export default defineConfig({
	useTabs: true,
	printWidth: 100,
	sortPackageJson: false,
	sortImports: {
		ignoreCase: false,
		sortSideEffects: false,
	},
	ignorePatterns: [
		"node_modules",
		"build",
		".react-router",
		"vendor",

		// ".*" skips dot files and dot directories, for example .env. A negation
		// keeps a dot directory that holds code. For example, app/.server holds
		// the modules that only run on the server.
		".*",
		"!.github",
		"!app/.server",
	],
});
