import type { Meta } from "@storybook/react";
import type { StoryObj } from "@storybook/react";

import { NoteComparison } from "../components/note/comparison/NoteComparison";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export

export default {
	title: "Uils/NoteComparison",
	component: NoteComparison,

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
} as Meta<typeof NoteComparison>;

type Story = StoryObj<typeof NoteComparison>;

export const Basic: Story = {
	args: {
		revisionA: { caption: "CaptionA", text: "Test *XXXX* Old Text" },
		revisionB: { caption: "CaptionB", text: "Test *XXXX* New Text" },
	},
};
