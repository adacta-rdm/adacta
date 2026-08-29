import { defineConfig } from "oxlint";

export default defineConfig({
	options: {
		typeAware: true,
	},
	plugins: ["eslint", "typescript", "unicorn", "node", "import", "jsdoc", "react", "react-perf"],
	ignorePatterns: ["node_modules", "build", ".react-router", "vendor", ".*", "!.github"],
	rules: {
		"import/no-duplicates": ["error", { preferInline: true }],

		// This rule is type-aware. It catches a deprecated method on a third-party object,
		// for example Database.exec in bun:sqlite.
		"typescript/no-deprecated": "error",

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
