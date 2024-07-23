import type { Meta } from "@storybook/react";
import { graphql } from "react-relay";

import { Note } from "../components/note/Note"; // More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export

import type { NoteStoriesQuery } from "@/relay/NoteStoriesQuery.graphql";
import type { AdactaStoryObj } from "~/.storybook/types";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
	title: "Note",
	component: Note,
} satisfies Meta<typeof Note>;

export default meta;

type Story = AdactaStoryObj<typeof meta, NoteStoriesQuery>;

export const Basic: Story = {
	parameters: {
		relay: {
			query: graphql`
				query NoteStoriesQuery {
					node(id: "foo") {
						...Note
					}
				}
			`,
			props: {
				note: (queryResult) => queryResult.node!,
			},
			mockResolvers: {
				Note: () => ({
					caption: "Test0",
					text: "Test Text",
					revisions: new Array(5)
						.fill(undefined)
						.map((d, i) => ({ caption: `Test${i + 1}`, text: `Test Text ${i + 1} 1234` })),
				}),
			},
		},
	},
	args: {
		offerHistory: true,
	},
};
