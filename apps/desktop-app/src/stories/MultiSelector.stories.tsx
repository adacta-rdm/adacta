import type { Meta, StoryFn } from "@storybook/react";
import React from "react";

import "@elastic/eui/dist/eui_theme_light.css";
import { MultiTimeSelector } from "../components/resource/MultiTimeSelector";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export

export default {
	title: "MultiSelector",
	component: MultiTimeSelector,
} as Meta<typeof MultiTimeSelector>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: StoryFn<typeof MultiTimeSelector> = (args) => <MultiTimeSelector {...args} />;

export const Basic = Template.bind({});
Basic.args = {};
