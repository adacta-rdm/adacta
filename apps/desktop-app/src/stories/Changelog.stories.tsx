import { assertDefined } from "@omegadot/assert";
import type { Meta } from "@storybook/react";
import React from "react";
import { graphql } from "react-relay";

import { Changelog } from "../components/changelog/Changelog";

import type { ChangelogDeviceQuery } from "@/relay/ChangelogDeviceQuery.graphql";
import type { ChangelogSampleQuery } from "@/relay/ChangelogSampleQuery.graphql";
import { RelayMockedFragmentHelper } from "~/.storybook/helpers/RelayMockedFragmentHelper";
import type { RelayMockedFragmentHelperStory } from "~/.storybook/helpers/RelayMockedFragmentHelper";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export

export default {
	title: "Changelog",
	component: RelayMockedFragmentHelper,
} as Meta<typeof RelayMockedFragmentHelper>;

function getSlotNames(amount = 4) {
	const slotNames = ["mfc", "furnace", "reactor"];
	const slots = [];
	for (let i = 0; i < amount; i++) {
		slots.push(`${slotNames[i % slotNames.length]}${Math.floor(i / slotNames.length)}`);
	}
	return slots;
}

const deviceQuery = graphql`
	query ChangelogDeviceQuery {
		repository(id: "foo") {
			device(id: "bar") {
				...Changelog
			}
		}
	}
`;

export const Device: RelayMockedFragmentHelperStory<ChangelogDeviceQuery> = {
	args: {
		mockResolvers: {
			Device: () => ({
				usagesAsProperty: getSlotNames(2).map((s) => ({ name: s })),
				properties: getSlotNames().map((s) => ({ name: s })),
			}),
		},
		query: deviceQuery,
		renderTestSubject: (data) => {
			assertDefined(data.repository.device);
			return <Changelog data={data.repository.device} />;
		},
	},
};

export const DeviceWithAdditional: RelayMockedFragmentHelperStory<ChangelogDeviceQuery> = {
	args: {
		mockResolvers: {
			Device: () => ({
				usagesAsProperty: getSlotNames(2).map((s) => ({ name: s })),
				properties: getSlotNames().map((s) => ({ name: s })),
			}),
		},
		query: deviceQuery,
		renderTestSubject: (data) => {
			assertDefined(data.repository.device);
			return (
				<Changelog
					data={data.repository.device}
					additionalEvents={[
						{
							time: new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 3),
							info: { icon: <>Icon</>, children: <>Test 123</> },
						},
					]}
				/>
			);
		},
	},
};

export const Sample: RelayMockedFragmentHelperStory<ChangelogSampleQuery> = {
	args: {
		query: graphql`
			query ChangelogSampleQuery {
				repository(id: "foo") {
					sample(id: "bar") {
						...Changelog
					}
				}
			}
		`,
		renderTestSubject: (data) => {
			assertDefined(data.repository.sample);
			return <Changelog data={data.repository.sample} />;
		},
	},
};
