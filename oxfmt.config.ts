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
		".*",
		"!.github",
		"node_modules",
		"dist",

		// Left over from the v1 and v2 trees. Remove these entries once the
		// directories are deleted.
		"@",
		".react-router",
		".adacta",
		"scratch",
		".scratch",
	],
});
