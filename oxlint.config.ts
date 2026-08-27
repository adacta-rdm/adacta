import { defineConfig } from "oxlint";

export default defineConfig({
	options: {
		typeAware: true,
	},
	plugins: ["eslint", "typescript", "unicorn", "node", "import", "jsdoc"],
	ignorePatterns: [
		".*",
		"!.github",
		"node_modules",
		"dist",

		"@",
		".react-router",
		".adacta",
		"scratch",
	],
	rules: {
		"import/no-duplicates": ["error", { preferInline: true }],

		// Ignore names starting with an underscore. This is the common way to mark
		// a parameter or variable as intentionally unused.
		"no-unused-vars": [
			"error",
			{
				argsIgnorePattern: "^_",
				varsIgnorePattern: "^_",
			},
		],
	},
});
