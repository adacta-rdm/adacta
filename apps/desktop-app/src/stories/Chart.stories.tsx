import type { Meta } from "@storybook/react";
import { graphql } from "react-relay";

import { Chart } from "../components/chart/Chart";

import type { ChartsQuery } from "@/relay/ChartsQuery.graphql";
import type { RelayMockedFragmentHelperStory } from "~/.storybook/helpers/RelayMockedFragmentHelper";
import { RelayMockedFragmentHelper } from "~/.storybook/helpers/RelayMockedFragmentHelper";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
	title: "Chart",
	component: RelayMockedFragmentHelper,
} as Meta<typeof RelayMockedFragmentHelper>;

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

export const Basic: RelayMockedFragmentHelperStory<ChartsQuery> = {
	args: {
		query: graphql`
			query ChartsQuery {
				repository(id: "foo") {
					resource(id: "bar") {
						... on ResourceTabularData {
							downSampled(dataPoints: 100) {
								...ChartFragment
							}
						}
					}
				}
			}
		`,
		mockResolvers: {
			DataSeries() {
				return { values: getDataSeries(), unit: "°C", label: "Test" };
			},
		},
		renderTestSubject: (data) =>
			data.repository.resource?.downSampled != null ? (
				<Chart chart={data.repository.resource.downSampled} />
			) : (
				<></>
			),
	},
};
