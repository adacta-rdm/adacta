import type { Meta } from "@storybook/react";
import type { StoryObj } from "@storybook/react";

import { RoundedIcon } from "../components/changelog/RoundedIcon";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export

const meta = {
	title: "Changelog/RoundedIcon",
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
} satisfies Meta<typeof RoundedIcon>;
export default meta;

export type Story = StoryObj<typeof meta>;

export const Basic: Story = {
	args: { size: "l", color: "primary", iconType: "gear" },
};
