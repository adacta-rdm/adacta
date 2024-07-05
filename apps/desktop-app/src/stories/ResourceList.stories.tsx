import { isNonNullish } from "@omegadot/assert";
import type { Meta } from "@storybook/react";
import React from "react";
import { graphql } from "react-relay";

import { ResourceListTable } from "../components/resource/list/ResourceListTable";

import type { ResourceListStoryQuery } from "@/relay/ResourceListStoryQuery.graphql";
import type { TypedMockResolvers } from "~/.storybook/helpers/RelayMockedDataProvider";
import type { RelayMockedFragmentHelperStory } from "~/.storybook/helpers/RelayMockedFragmentHelper";
import { RelayMockedFragmentHelper } from "~/.storybook/helpers/RelayMockedFragmentHelper";
import { getSeededRandomInt } from "~/.storybook/helpers/seededRandomUtils";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
	title: "ResourceList",
	component: RelayMockedFragmentHelper,
} as Meta<typeof RelayMockedFragmentHelper>;

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

const mockResolvers: TypedMockResolvers = {
	ResourceConnection: (ctx) => {
		return {
			// Request 5 resources
			edges: Array(ctx.name === "children" ? getSeededRandomInt(1, 4) : 10).fill(undefined),
		};
	},
	Resource: () => ({ __typename: getType() }),
	ResourceGeneric: () => ({ name: "Raw.txt" }),
	ResourceTabularData: () => ({
		name: "Tab.csv",
		devices: Array(getSeededRandomInt(1, 4)).fill(undefined),
	}),
};

const query = graphql`
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
`;

export const Basic: RelayMockedFragmentHelperStory<ResourceListStoryQuery> = {
	args: {
		query,
		mockResolvers,
		renderTestSubject: (data) => (
			<ResourceListTable
				resources={data.repository.resources.edges
					.flatMap((e) => (e !== null ? e.node : []))
					.filter(isNonNullish)}
				connections={[]}
			/>
		),
	},
};

export const ManyDevices: RelayMockedFragmentHelperStory<ResourceListStoryQuery> = {
	args: {
		query: query,
		mockResolvers: {
			...mockResolvers,
			ResourceTabularData: () => ({
				name: "Tab.csv",
				devices: Array(getSeededRandomInt(8, 10)).fill(undefined),
			}),
		},
		renderTestSubject: (data) => (
			<ResourceListTable
				resources={data.repository.resources.edges
					.flatMap((e) => (e !== null ? e.node : []))
					.filter(isNonNullish)}
				connections={[]}
			/>
		),
	},
};
