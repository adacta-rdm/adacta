import type { Meta } from "@storybook/react";

import {
	FreeComponentSelection,
	FreeComponentSelectionGraphQLQuery,
} from "../components/device/FreeComponentSelection";

import type { FreeComponentSelectionQuery } from "@/relay/FreeComponentSelectionQuery.graphql";
import type { IWithRouterParameters } from "~/.storybook/found/withRouter";
import type { AdactaStoryObj } from "~/.storybook/types";
import { createIDatetime } from "~/lib/createDate";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export

const meta = {
	title: "Utils/FreeComponentSelection",
	component: FreeComponentSelection,
} satisfies Meta<typeof FreeComponentSelection>;

export default meta;

type Story = AdactaStoryObj<typeof meta, FreeComponentSelectionQuery>;

const now = new Date();

export const Basic: Story = {
	parameters: {
		router: {
			location: ["/repositories/:repositoryId", { repositoryId: "foo" }],
		} satisfies IWithRouterParameters,
		relay: {
			query: FreeComponentSelectionGraphQLQuery,
			variables: {
				deviceId: "123",
				repositoryId: "foo",
				begin: createIDatetime(now),
			},
		},
	},
	args: {
		deviceId: "123",
		begin: now,
		valueOfSelected: "123",
		onChange: () => {},
	},
};
