import { graphql } from "react-relay";

import type { GamryTimeSelectionStoryQuery } from "@/relay/GamryTimeSelectionStoryQuery.graphql";
import type { AdactaStoryMeta, AdactaStoryObj } from "~/.storybook/types";
import { GamryTimeSelection } from "~/apps/desktop-app/src/components/importWizzard/gamryDta/GamryTimeSelection";
import { HistoryService } from "~/apps/desktop-app/src/services/history/HistoryService";
import { assertDefined } from "~/lib/assert";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
	title: "GamryTimeSelection",
	component: GamryTimeSelection,
	parameters: {
		services: [new HistoryService()],
		router: {
			location: ["/repositories/:repositoryId", { repositoryId: "foo" }],
		},
		relay: {
			query: graphql`
				query GamryTimeSelectionStoryQuery @relay_test_operation {
					gamryToStep1(resourceId: "foo") {
						data {
							...GamryTimeSelection
						}
					}
				}
			`,
			props: {
				data: (queryResult) => {
					assertDefined(queryResult.gamryToStep1.data);
					return queryResult.gamryToStep1.data;
				},
			},
			mockResolvers: {},
		},
	},
} satisfies AdactaStoryMeta<typeof GamryTimeSelection, GamryTimeSelectionStoryQuery>;
export default meta;

type Story = AdactaStoryObj<typeof meta, GamryTimeSelectionStoryQuery>;

export const Basic: Story = {
	args: {},
};
