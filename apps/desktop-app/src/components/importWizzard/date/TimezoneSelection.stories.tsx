import "@elastic/eui/dist/eui_theme_light.css";

import type { Meta, StoryObj } from "@storybook/react";

import { TimezoneSelection } from "./TimezoneSelection";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
	title: "Utils/TimezoneSelection",
	component: TimezoneSelection,
} satisfies Meta<typeof TimezoneSelection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Simple: Story = {
	args: {
		timezone: "Europe/Berlin",
		setTimezone: () => {},
	},
};
