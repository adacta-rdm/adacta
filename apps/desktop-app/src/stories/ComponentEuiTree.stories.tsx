import { graphql } from "react-relay";

import type { ComponentEuiTreeStoriesQuery } from "@/relay/ComponentEuiTreeStoriesQuery.graphql";
import type { AdactaStoryMeta, AdactaStoryObj } from "~/.storybook/types";
import { ComponentEuiTree } from "~/apps/desktop-app/src/components/device/ComponentEuiTree";
import { HistoryService } from "~/apps/desktop-app/src/services/history/HistoryService";
import { DocFlyoutService } from "~/apps/desktop-app/src/services/toaster/FlyoutService";
import { ToasterService } from "~/apps/desktop-app/src/services/toaster/ToasterService";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
	title: "ComponentEuiTree",
	component: ComponentEuiTree,
	parameters: {
		services: [new HistoryService(), new ToasterService(), new DocFlyoutService()],
		router: {
			location: ["/repositories/:repositoryId", { repositoryId: "foo" }],
		},
		relay: {
			query: graphql`
				query ComponentEuiTreeStoriesQuery @relay_test_operation {
					repository(id: "foo") {
						device(id: "bar") {
							...ComponentEuiTree
						}
					}
				}
			`,
			props: {
				device: (queryResult) => {
					return queryResult.repository.device;
				},
			},
			mockResolvers: {
				Device: () => ({
					components: new Array(40).fill(undefined),
				}),
				ComponentWithPathAndTime: () => ({
					pathFromTopLevelDevice: getPath(),
					component: {
						__typename: "Device",
					},
				}),
			},
		},
	},
} satisfies AdactaStoryMeta<typeof ComponentEuiTree, ComponentEuiTreeStoriesQuery>;

let pathCounter = 0;

function getPath() {
	if (pathCounter === 0 || pathCounter === 1) {
		const root = `root${pathCounter}`;
		pathCounter = pathCounter + 1;
		return [root];
	}

	pathCounter = pathCounter + 1;

	const ret = [`root${pathCounter % 2}`, `component${pathCounter - 2}`];
	return ret;
}

export default meta;

type Story = AdactaStoryObj<typeof meta>;

export const LargeGroups: Story = {}; //
