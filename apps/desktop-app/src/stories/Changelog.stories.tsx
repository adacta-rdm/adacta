import React from "react";
import { graphql } from "react-relay";

import { Changelog } from "../components/changelog/Changelog";

import type { ChangelogStoriesQuery } from "@/relay/ChangelogStoriesQuery.graphql";
import type { AdactaStoryMeta, AdactaStoryObj } from "~/.storybook/types";
import { HistoryService } from "~/apps/desktop-app/src/services/history/HistoryService";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
	title: "Changelog",
	component: Changelog,
	parameters: {
		services: [new HistoryService()],
		router: {
			location: ["/repositories/:repositoryId", { repositoryId: "foo" }],
		},
		relay: {
			query: graphql`
				query ChangelogStoriesQuery @relay_test_operation {
					repository(id: "foo") {
						device(id: "bar") {
							...Changelog
						}
					}
				}
			`,
			props: {
				data: (queryResult) => queryResult.repository.device,
			},
			mockResolvers: {
				Device: () => ({
					usagesAsProperty: getSlotNames(2).map((s) => ({ name: s })),
					properties: getSlotNames().map((s) => ({ name: s })),
				}),
			},
		},
	},
} satisfies AdactaStoryMeta<typeof Changelog, ChangelogStoriesQuery>;

export default meta;

type Story = AdactaStoryObj<typeof meta>;

function getSlotNames(amount = 4) {
	const slotNames = ["mfc", "furnace", "reactor"];
	const slots = [];
	for (let i = 0; i < amount; i++) {
		slots.push(`${slotNames[i % slotNames.length]}${Math.floor(i / slotNames.length)}`);
	}
	return slots;
}

export const Device: Story = {};

export const DeviceWithAdditionalEvents: Story = {
	args: {
		additionalEvents: [
			{
				time: new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 3),
				info: { icon: <>Icon</>, children: <>Test 123</> },
			},
		],
	},
};
