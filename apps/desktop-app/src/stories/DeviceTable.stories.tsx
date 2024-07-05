import type { Meta } from "@storybook/react";
import React from "react";
import { graphql } from "react-relay";

import { DeviceTable } from "../components/device/list/flat/DeviceTable";

import type { DeviceTableQuery } from "@/relay/DeviceTableQuery.graphql";
import type { RelayMockedFragmentHelperStory } from "~/.storybook/helpers/RelayMockedFragmentHelper";
import { RelayMockedFragmentHelper } from "~/.storybook/helpers/RelayMockedFragmentHelper";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
	title: "DeviceTable",
	component: RelayMockedFragmentHelper,
} as Meta<typeof RelayMockedFragmentHelper>;

export const Basic: RelayMockedFragmentHelperStory<DeviceTableQuery> = {
	args: {
		query: graphql`
			query DeviceTableQuery {
				repository(id: "foo") {
					devices {
						edges {
							...DeviceTable_devices
						}
					}
				}
			}
		`,
		mockResolvers: {
			Device: () => ({
				specifications: [
					// Only specification required here is the manufacturer
					{ value: "Test-Manufacturer" },
				],
			}),
			DeviceConnection: () => ({
				// Request 5 devices
				edges: Array(25).fill(""),
			}),
		},
		renderTestSubject: (data) => (
			<DeviceTable devices={data.repository.devices.edges} connections={[]} />
		),
	},
};
