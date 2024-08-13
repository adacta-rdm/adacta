import { graphql } from "react-relay";

import { ResourceListTable } from "../components/resource/list/ResourceListTable";

import type { ResourceListStoryQuery } from "@/relay/ResourceListStoryQuery.graphql";
import type { AdactaStoryMeta, AdactaStoryObj } from "~/.storybook/types";
import { HistoryService } from "~/apps/desktop-app/src/services/history/HistoryService";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
	title: "ResourceList",
	component: ResourceListTable,
	parameters: {
		services: [new HistoryService()],
		router: {
			location: ["/repositories/:repositoryId", { repositoryId: "foo" }],
		},
		relay: {
			query: graphql`
				query ResourceListStoryQuery @relay_test_operation {
					repository(id: "foo") {
						resources {
							edges {
								node {
									...ResourceListTableFragment
								}
							}
						}
					}
				}
			`,
			props: {
				resources: (queryResult) =>
					queryResult.repository.resources.edges.flatMap((e) => e?.node ?? []),
			},
			mockResolvers: {
				ResourceConnection: ({ name, random }) => {
					return {
						edges: Array(name === "children" ? random.intBetween(1, 4) : 10).fill({}),
					};
				},
				Resource: (_, id) => ({ __typename: getType(id()) }),
				ResourceGeneric: () => ({ name: "Raw.txt" }),
				ResourceTabularData: ({ random }) => ({
					name: "Tab.csv",
					devices: random.array(1, 4),
				}),
			},
		},
	},
} satisfies AdactaStoryMeta<typeof ResourceListTable, ResourceListStoryQuery>;
export default meta;

type Story = AdactaStoryObj<typeof meta, ResourceListStoryQuery>;

const getType = (typeCounter: number) => {
	const types = [
		"ResourceGeneric",
		"ResourceGeneric",
		"ResourceGeneric",
		"ResourceGeneric",
		"ResourceTabularData",
	];
	return types[typeCounter % types.length];
};

export const Basic: Story = {
	args: {
		connections: [],
	},
};

export const ManyDevices: Story = {
	parameters: {
		relay: {
			mockResolvers: {
				ResourceTabularData: ({ random }) => ({
					name: "Tab.csv",
					devices: random.array(8, 10),
				}),
			},
		},
	},
	args: {
		connections: [],
	},
};
