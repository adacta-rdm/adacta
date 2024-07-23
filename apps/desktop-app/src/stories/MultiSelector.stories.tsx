import type { Meta, StoryObj } from "@storybook/react";

import { MultiTimeSelector } from "../components/resource/MultiTimeSelector";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
	title: "MultiSelector",
	component: MultiTimeSelector,
} satisfies Meta<typeof MultiTimeSelector>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic: Story = {
	args: {
		value: 60 * 60 * 2 + 60 * 5 + 30, // 2h 5m 30s
		onChange: () => {},
	},
};
