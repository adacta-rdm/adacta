import React from "react";
import { graphql } from "react-relay";
import type { PreloadedQuery } from "react-relay/hooks";
import { usePreloadedQuery } from "react-relay/hooks";

import { DeviceOverview } from "./DeviceOverview";

import type { DevicePopoverQuery } from "@/relay/DevicePopoverQuery.graphql";

interface IProps {
	queryRef: PreloadedQuery<DevicePopoverQuery>;

	timestamp?: Date;
	historyMode: boolean;
}

export const DevicePopoverGraphQLQuery = graphql`
	query DevicePopoverQuery($deviceId: ID!, $time: DateTime!, $repositoryId: ID!) {
		repository(id: $repositoryId) {
			device(id: $deviceId) {
				...DeviceOverview @arguments(time: $time)
			}
		}
	}
`;

export function DevicePopover(props: IProps) {
	const { repository: data } = usePreloadedQuery(DevicePopoverGraphQLQuery, props.queryRef);

	if (data.device === null) {
		return null;
	}

	return (
		<DeviceOverview
			viewTimestamp={props.timestamp}
			device={data.device}
			popoverMode={true}
			historyMode={props.historyMode}
		/>
	);
}
