import type { Meta } from "@storybook/react";
import React from "react";
import { graphql } from "react-relay";

import { SampleTable } from "../components/sample/SampleTable";

import type { SampleTableQuery } from "@/relay/SampleTableQuery.graphql";
import type { RelayMockedFragmentHelperStory } from "~/.storybook/helpers/RelayMockedFragmentHelper";
import { RelayMockedFragmentHelper } from "~/.storybook/helpers/RelayMockedFragmentHelper";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
	title: "SampleTable",
	component: RelayMockedFragmentHelper,
} as Meta<typeof RelayMockedFragmentHelper>;

export const Basic: RelayMockedFragmentHelperStory<SampleTableQuery> = {
	args: {
		addDelayToNonInitialOperations: 1000,
		query: graphql`
			query SampleTableQuery {
				repository(id: "foo") {
					samples {
						edges {
							node {
								...SampleTable_samples
							}
						}
					}
				}
			}
		`,
		mockResolvers: {
			SampleConnection: () => ({
				// Request 5 samples
				edges: Array(5).fill(undefined),
			}),
		},
		renderTestSubject: (data) => (
			<SampleTable samples={data.repository.samples.edges.map((e) => e.node)} />
		),
	},
};
