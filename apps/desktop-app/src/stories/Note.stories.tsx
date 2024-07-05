import { assertDefined } from "@omegadot/assert";
import type { Meta } from "@storybook/react";
import React from "react";
import { graphql } from "react-relay";

import { Note } from "../components/note/Note"; // More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export

import type { NoteQuery } from "@/relay/NoteQuery.graphql";
import type { RelayMockedFragmentHelperStory } from "~/.storybook/helpers/RelayMockedFragmentHelper";
import { RelayMockedFragmentHelper } from "~/.storybook/helpers/RelayMockedFragmentHelper";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
	title: "Note",
	component: RelayMockedFragmentHelper,
} as Meta<typeof RelayMockedFragmentHelper>;

export const Basic: RelayMockedFragmentHelperStory<NoteQuery> = {
	args: {
		query: graphql`
			query NoteQuery {
				repository(id: "foo") {
					device(id: "bar") {
						notes {
							edges {
								node {
									...Note
								}
							}
						}
					}
				}
			}
		`,
		mockResolvers: {
			Note: () => ({
				caption: "Test0",
				text: "Test Text",
				revisions: new Array(5)
					.fill(undefined)
					.map((d, i) => ({ caption: `Test${i + 1}`, text: `Test Text ${i + 1} 1234` })),
			}),
		},
		renderTestSubject: (data) => {
			assertDefined(data.repository.device);
			return <Note note={data.repository.device.notes.edges[0].node} offerHistory={true} />;
		},
	},
};
