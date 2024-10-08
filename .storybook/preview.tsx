import { EuiProvider } from "@elastic/eui";
import type { Preview } from "@storybook/react";

import { withRouter } from "~/.storybook/found/withRouter";
import { withRelay } from "~/.storybook/relay/withRelay";
import { withServices } from "~/.storybook/services/withServices";

import "@/euiIcons";
import "@/tailwind.dist.css";
import "@elastic/eui/dist/eui_theme_light.css";
import "@elastic/charts/dist/theme_light.css";

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},

	decorators: [
		withServices,
		withRelay,
		withRouter,
		(Story) => (
			<EuiProvider colorMode="light">
				<Story />
			</EuiProvider>
		),
	],
};

export default preview;
