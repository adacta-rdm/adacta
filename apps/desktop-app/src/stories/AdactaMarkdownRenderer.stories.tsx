import type { Meta, StoryObj } from "@storybook/react";

import { AdactaMarkdownFormat } from "../components/markdown/AdactaMarkdownFormat";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export

export default {
	title: "Utils/AdactaMarkdownFormat",
	component: AdactaMarkdownFormat,
} as Meta<typeof AdactaMarkdownFormat>;

type Story = StoryObj<typeof AdactaMarkdownFormat>;

export const Basic: Story = {
	args: {
		children: "Test Fooo 123 *bbb* :ins-start:XXX:ins-end: :del-start:XXX:del-end: 1234",
	},
};
