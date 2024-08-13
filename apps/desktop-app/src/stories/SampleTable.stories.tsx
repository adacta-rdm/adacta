import { graphql } from "react-relay";

import { SampleTable } from "../components/sample/SampleTable";

import type { SampleTableStoriesQuery } from "@/relay/SampleTableStoriesQuery.graphql";
import type { AdactaStoryMeta, AdactaStoryObj } from "~/.storybook/types";
import { HistoryService } from "~/apps/desktop-app/src/services/history/HistoryService";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
	title: "SampleTable",
	component: SampleTable,
	parameters: {
		services: [new HistoryService()],
		router: {
			location: ["/repositories/:repositoryId", { repositoryId: "foo" }],
		},
		relay: {
			query: graphql`
				query SampleTableStoriesQuery {
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
			props: {
				samples: (queryResult) => queryResult.repository.samples.edges.map((edge) => edge.node),
			},
		},
	},
} satisfies AdactaStoryMeta<typeof SampleTable, SampleTableStoriesQuery>;

export default meta;

type Story = AdactaStoryObj<typeof meta>;

export const Basic: Story = {
	args: {},
};
