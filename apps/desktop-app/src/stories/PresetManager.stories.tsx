import type { Meta } from "@storybook/react";

import {
	PresetManager,
	PresetManagerGraphQLQuery,
} from "../components/importWizzard/preset/PresetManager";

import type { PresetManagerQuery } from "@/relay/PresetManagerQuery.graphql";
import type { IWithRouterParameters } from "~/.storybook/found/withRouter";
import type { AdactaStoryObj } from "~/.storybook/types";
import { HistoryService } from "~/apps/desktop-app/src/services/history/HistoryService";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export

const meta = {
	title: "Utils/PresetManager",
	component: PresetManager,
} satisfies Meta<typeof PresetManager>;

export default meta;

type Story = AdactaStoryObj<typeof meta, PresetManagerQuery>;

export const Basic: Story = {
	parameters: {
		services: [new HistoryService()],
		router: {
			location: ["/repositories/:repositoryId", { repositoryId: "foo" }],
		} satisfies IWithRouterParameters,
		relay: {
			query: PresetManagerGraphQLQuery,
			mockResolvers: {
				ResourceConnection: () => ({ edges: new Array(5).fill(undefined) }),
				ImportPreset: ({ random }) => ({
					columns: random.array(20, 50).map((_, i) => `Column ${i}`),
				}),
			},
		},
	},
	args: {},
};
