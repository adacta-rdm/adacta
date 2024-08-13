import type { Meta } from "@storybook/react";
import { graphql } from "react-relay";

import { Chart } from "../components/chart/Chart";

import type { ChartsStoriesQuery } from "@/relay/ChartsStoriesQuery.graphql";
import type { AdactaStoryObj } from "~/.storybook/types";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
	title: "Chart",
	component: Chart,
} satisfies Meta<typeof Chart>;

export default meta;

type Story = AdactaStoryObj<typeof meta, ChartsStoriesQuery>;

export const Basic: Story = {
	parameters: {
		relay: {
			query: graphql`
				query ChartsStoriesQuery {
					node(id: "bar") {
						... on ResourceTabularData {
							downSampled(dataPoints: 100) {
								...ChartFragment
							}
						}
					}
				}
			`,
			props: {
				chart: (queryResult) => queryResult.node!.downSampled!,
			},
		},
	},
};
