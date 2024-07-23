import { graphql } from "react-relay";

import { ResourceListTable } from "../components/resource/list/ResourceListTable";

import type { ResourceListStoryQuery } from "@/relay/ResourceListStoryQuery.graphql";
import { getSeededRandomInt } from "~/.storybook/relay/defaultMockResolvers";
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
				ResourceConnection: (ctx) => {
					return {
						edges: Array(ctx.name === "children" ? getSeededRandomInt(1, 4) : 10).fill({}),
					};
				},
				Resource: () => ({ __typename: getType() }),
				ResourceGeneric: () => ({ name: "Raw.txt" }),
				ResourceTabularData: () => ({
					name: "Tab.csv",
					devices: Array(getSeededRandomInt(1, 4)).fill({}),
				}),
			},
		},
	},
} satisfies AdactaStoryMeta<typeof ResourceListTable, ResourceListStoryQuery>;
export default meta;

type Story = AdactaStoryObj<typeof meta, ResourceListStoryQuery>;

let typeCounter = 0;
const getType = () => {
	typeCounter++;
	const types: ("ResourceGeneric" | "ResourceTabularData")[] = [
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
				ResourceTabularData: () => ({
					name: "Tab.csv",
					devices: Array(getSeededRandomInt(8, 10)).fill(undefined),
				}),
			},
		},
	},
	args: {
		connections: [],
	},
};
