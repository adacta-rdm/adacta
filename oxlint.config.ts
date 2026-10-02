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

		// A promise that nobody awaits passes the type check. This rule reports it.
		// For example, a database query without await.
		"typescript/no-floating-promises": "error",

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

	overrides: [
		{
			// In Bun 1.4, a matcher after .rejects or .resolves waits for the promise
			// itself and returns nothing. The tests still await it, because Bun plans
			// to return a promise instead (oven-sh/bun pull request 33289). Until a
			// release does so, this rule reports each of those awaits. Remove this
			// override after that release.
			files: ["**/*.test.ts", "**/*.test.tsx"],
			rules: {
				"typescript/await-thenable": "off",
			},
		},
	],
});
