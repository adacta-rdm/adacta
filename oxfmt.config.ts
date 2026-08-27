import { defineConfig } from "oxfmt";

export default defineConfig({
	useTabs: true,
	printWidth: 100,
	sortPackageJson: false,
	sortImports: {
		ignoreCase: false,
		sortSideEffects: false,
	},
	ignorePatterns: ["node_modules", "build", ".react-router", ".*", "!.github"],
});
