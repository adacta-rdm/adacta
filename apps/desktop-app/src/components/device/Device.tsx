import { assertDefined } from "@omegadot/assert";
import React from "react";
import { graphql } from "react-relay";
import type { PreloadedQuery } from "react-relay/hooks";
import { usePreloadedQuery } from "react-relay/hooks";

import { DeviceOverview } from "./DeviceOverview";

import type { DeviceQuery } from "@/relay/DeviceQuery.graphql";

export const DeviceGraphQLQuery = graphql`
	query DeviceQuery($deviceId: ID!, $time: DateTime, $repositoryId: ID!) {
		repository(id: $repositoryId) {
			device(id: $deviceId) {
				...DeviceOverview @arguments(time: $time)
			}
		}
	}
`;

export function Device(props: {
	queryRef: PreloadedQuery<DeviceQuery>;
	viewTimeStamp?: Date;
	historyMode: boolean;
}) {
	const data = usePreloadedQuery(DeviceGraphQLQuery, props.queryRef);

	// Assertion justified since this component will only render if someone clicks on a device link
	assertDefined(data.repository.device);
	return (
		<DeviceOverview
			viewTimestamp={props.viewTimeStamp}
			device={data.repository.device}
			historyMode={props.historyMode}
		/>
	);
}
