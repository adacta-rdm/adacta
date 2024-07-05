import type { Meta } from "@storybook/react";
import type { StoryObj } from "@storybook/react";

import { RoundedIcon } from "../components/changelog/RoundedIcon";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export

export default {
	title: "RoundedIcon",
	component: RoundedIcon,
	argTypes: {
		size: {
			options: ["s", "m", "l", "xl"],
			control: { type: "select" },
		},
		iconType: {
			options: ["gear", "cross", "push", "pull"],
			control: { type: "select" },
		},
	},
} as Meta<typeof RoundedIcon>;

export type Story = StoryObj<typeof RoundedIcon>;

export const Basic: Story = {
	args: { size: "l", color: "primary", iconType: "gear" },
};
