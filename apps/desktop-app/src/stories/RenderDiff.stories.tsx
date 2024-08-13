import type { Meta } from "@storybook/react";
import type { StoryObj } from "@storybook/react";

import { RenderChanges } from "../components/note/diff/RenderChanges";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
	title: "RenderDiff",
	component: RenderChanges,
} satisfies Meta<typeof RenderChanges>;

export default meta;

export type Story = StoryObj<typeof meta>;

export const Markdown: Story = {
	args: { renderMode: "markdown", beforeText: "Test-Note **Foo**", afterText: "Test-Event Bar" },
};

export const React: Story = {
	args: { renderMode: "react", beforeText: "Test-Note", afterText: "Test-Event" },
};
