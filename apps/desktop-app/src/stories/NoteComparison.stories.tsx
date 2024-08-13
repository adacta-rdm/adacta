import type { Meta } from "@storybook/react";
import type { StoryObj } from "@storybook/react";

import { NoteComparison } from "../components/note/comparison/NoteComparison";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export

const meta = {
	title: "Utils/NoteComparison",
	component: NoteComparison,
} satisfies Meta<typeof NoteComparison>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic: Story = {
	args: {
		revisionA: { caption: "CaptionA", text: "Test *XXXX* Old Text" },
		revisionB: { caption: "CaptionB", text: "Test *XXXX* New Text" },
	},
};
