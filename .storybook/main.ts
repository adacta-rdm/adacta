import { join } from "path";

import { mergeConfig } from "vite";
import { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
	stories: [
		"../apps/desktop-app/src/**/*.mdx",
		"../apps/desktop-app/src/**/*.stories.@(js|jsx|ts|tsx)",
	],
	addons: [
		"@storybook/addon-links",
		"@storybook/addon-essentials",
		"@storybook/addon-interactions",
	],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
	viteFinal(config) {
		return mergeConfig(config, {
			assetsInclude: ["/sb-preview/runtime.js"],
			resolve: {
				alias: {
					found: join(__dirname, "mocks/found"),
				},
			},
		});
	},
	typescript: {
		// react-docgen-typescript causes issues as it tries to traverse the temp folder (where the
		// permissions cause issues)
		reactDocgen: "react-docgen",
	},
};

export default config;
