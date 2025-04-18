const config = {
	root: true,
	reportUnusedDisableDirectives: true,
	parserOptions: {
		tsConfigRootDir: __dirname,
		project: ["./tsconfig.json"],
	},
	env: {
		browser: true,
		node: true,
		es6: true,
	},
	settings: {
		react: { version: "detect" },
	},
	plugins: ["@typescript-eslint", "import", "relay"],
	extends: [
		"plugin:react/recommended",
		"plugin:react-hooks/recommended",
		"plugin:relay/strict",
		"eslint:recommended",
		"plugin:@typescript-eslint/eslint-recommended",
		"plugin:@typescript-eslint/recommended",
		// Linting with type information https://github.com/typescript-eslint/typescript-eslint/blob/master/docs/getting-started/linting/TYPED_LINTING.md
		"plugin:@typescript-eslint/recommended-requiring-type-checking",
		// "plugin:vitest/recommended",
		// "plugin:vitest/style",
		"plugin:import/typescript",
		// Turns off rules related to the "old" JSX transform since the new JSX transform from
		// React 17 is used
		// https://reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html#removing-unused-react-imports
		"plugin:react/jsx-runtime",
		// eslint-config-prettier:
		// Turns off all rules that are unnecessary or might conflict with Prettier.
		// Note that this config only turns rules off, so it only makes sense using it together with some other config.
		// Make sure to put it last, so it gets the chance to override other configs.
		"prettier",
		"plugin:storybook/recommended",
	],
	overrides: [
		{
			files: ["scripts/**/*.ts"],
			rules: {
				// Ok to print to console in scripts
				"no-console": "off",
			},
		},
		{
			files: ["*.js"],
			rules: {
				// Avoid false positives in js files
				"@typescript-eslint/restrict-template-expressions": "off",
				"@typescript-eslint/no-unsafe-assignment": "off",
				"@typescript-eslint/no-unsafe-return": "off",
				"@typescript-eslint/no-unsafe-member-access": "off",
				"@typescript-eslint/no-unsafe-call": "off",
			},
		},
		{
			files: ["*.tsx"],
			rules: {
				"class-methods-use-this": "off",
			},
		},
		{
			files: ["apps/desktop-app/src/routes/*.tsx"],
			rules: {
				"@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^getData$" }],
			},
		},
	],
	rules: {
		"class-methods-use-this": "error",
		"import/first": "error",
		"import/order": [
			"error",
			{
				alphabetize: { order: "asc" },
				groups: ["builtin", "external", ["sibling", "parent"]],
				"newlines-between": "always",
			},
		],
		"prefer-template": "error",
		"no-console": "error",
		"no-return-assign": "error",
		"no-useless-constructor": "off", // ESLint rule needs to be turned off to use the typescript specific one below
		"@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "as" }],
		"@typescript-eslint/explicit-function-return-type": "off",
		"@typescript-eslint/explicit-module-boundary-types": "off",
		"@typescript-eslint/naming-convention": [
			"error",
			{
				selector: "interface",
				format: ["PascalCase"],
				prefix: ["I"],
			},
			{
				selector: "typeParameter",
				format: ["PascalCase"],
				prefix: ["T", "U", "V", "W", "K"],
			},
		],
		"@typescript-eslint/no-empty-function": "off",
		"@typescript-eslint/no-empty-interface": "off",
		"@typescript-eslint/no-explicit-any": "off",
		"@typescript-eslint/no-floating-promises": "error",
		"@typescript-eslint/no-namespace": ["error", { allowDeclarations: true }],
		"@typescript-eslint/no-unnecessary-type-assertion": "off",
		"@typescript-eslint/no-use-before-define": "off",
		"@typescript-eslint/no-useless-constructor": "error",
		// Object rest properties offer a convenient way to shallow clone an object while omitting certain properties
		"@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true }],
		"@typescript-eslint/no-var-requires": "off",
		"@typescript-eslint/prefer-as-const": "error",
		"@typescript-eslint/prefer-for-of": "error",
		"@typescript-eslint/prefer-nullish-coalescing": "error",
		"@typescript-eslint/prefer-optional-chain": "error",
		"@typescript-eslint/restrict-template-expressions": [
			"error",
			{
				allowNumber: true,
				allowBoolean: true,
				allowNullish: true,
			},
		],
		"@typescript-eslint/return-await": "error",
		"@typescript-eslint/strict-boolean-expressions": [
			"error",
			{
				allowNullableBoolean: true,
				allowNullableString: true,
			},
		],
		"@typescript-eslint/unified-signatures": "error",
		"@typescript-eslint/consistent-type-imports": ["error"],
		"react/prop-types": "off",
		"relay/graphql-syntax": "error",
		"relay/compat-uses-vars": "error",
		"relay/graphql-naming": "error",
		"relay/generated-flow-types": "off",
		"relay/must-colocate-fragment-spreads": "error",
		"relay/no-future-added-value": "error",
		"relay/unused-fields": "error",
		"relay/function-required-argument": "error",
		"relay/hook-required-argument": "error",
		"@typescript-eslint/no-unsafe-argument": "off",
		"react/no-unknown-property": ["error", { ignore: ["css"] }], // CSS Property provided by Emotion
	},
};

module.exports = config;
