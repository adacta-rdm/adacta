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

let dataSeriesCounter = 0;

function getDataSeries() {
	// Tuples of X,Y Values
	const data = [
		[0, 0],
		[0, 3],
		[1.5, 5],
		[3, 3],
		[0, 3],
		[3, 0],
		[0, 0],
		[3, 1],
	];

	const d = data.map((d) => d[dataSeriesCounter % 2]);
	dataSeriesCounter++;
	return d;
}

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
			mockResolvers: {
				DataSeries() {
					return { values: getDataSeries(), unit: "°C", label: "Test" };
				},
			},
		},
	},
};
