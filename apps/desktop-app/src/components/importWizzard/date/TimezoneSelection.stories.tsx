import type { ComponentStory, ComponentMeta } from "@storybook/react";
import React from "react";

import "@elastic/eui/dist/eui_theme_light.css";

import { TimezoneSelection } from "./TimezoneSelection";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export

export default {
	title: "Utils/TimezoneSelection",
	component: TimezoneSelection,
	// More on argTypes: https://storybook.js.org/docs/react/api/argtypes
	// argTypes: {
	// 	backgroundColor: { control: "color" },
	// },
} as ComponentMeta<typeof TimezoneSelection>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof TimezoneSelection> = (args) => (
	<TimezoneSelection {...args} />
);

export const Simple = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Simple.args = {
	timezone: "Europe/Berlin",
	setTimezone: () => {},
};
