import type { Meta } from "@storybook/react";
import { graphql } from "react-relay";

import { DeviceTable } from "../components/device/list/flat/DeviceTable";

import type { DeviceTableStoriesQuery } from "@/relay/DeviceTableStoriesQuery.graphql";
import type { AdactaStoryObj } from "~/.storybook/types";
import { HistoryService } from "~/apps/desktop-app/src/services/history/HistoryService";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
	title: "DeviceTable",
	component: DeviceTable,
} satisfies Meta<typeof DeviceTable>;

export default meta;

type Story = AdactaStoryObj<typeof meta, DeviceTableStoriesQuery>;

export const Basic: Story = {
	parameters: {
		services: [new HistoryService()],
		router: {
			location: ["/repositories/:repositoryId", { repositoryId: "foo" }],
		},
		relay: {
			query: graphql`
				query DeviceTableStoriesQuery {
					repository(id: "foo") {
						devices {
							edges {
								...DeviceTable_devices
							}
						}
					}
				}
			`,
			props: {
				devices: (queryResult) => queryResult.repository.devices.edges,
			},
			mockResolvers: {
				Device: () => ({
					specifications: [
						// Only specification required here is the manufacturer
						{ value: "Test-Manufacturer" },
					],
				}),
				DeviceConnection: () => ({
					// Request 5 devices
					edges: Array(5).fill(1),
				}),
			},
		},
	},
	args: {
		connections: [],
	},
};
