import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from "@elastic/eui";
import React, { useMemo, useState } from "react";
import { graphql, usePaginationFragment, useSubscription } from "react-relay";
import type { PreloadedQuery } from "react-relay/hooks";
import { usePreloadedQuery } from "react-relay/hooks";
import type { GraphQLSubscriptionConfig } from "relay-runtime";

import { DeviceTable } from "./DeviceTable";
import { DeviceAdd } from "../../DeviceAdd";
import { DeviceListTemplate } from "../DeviceListTemplate";

import type { DeviceList$key } from "@/relay/DeviceList.graphql";
import type { DeviceListAddedOrUpdatedSubscription } from "@/relay/DeviceListAddedOrUpdatedSubscription.graphql";
import type { DeviceListFragment } from "@/relay/DeviceListFragment.graphql";
import type { DeviceListQuery } from "@/relay/DeviceListQuery.graphql";
import type { DeviceListRemovedSubscription } from "@/relay/DeviceListRemovedSubscription.graphql";

const DeviceListGraphQLFragment = graphql`
	fragment DeviceList on RepositoryQuery
	@refetchable(queryName: "DeviceListFragment")
	@argumentDefinitions(
		first: { type: "Int!" }
		after: { type: "String" }
		order_by: { type: "DeviceOrder" }
		filter: { type: "DevicesFilter" }
		showOnlyOwnDevices: { type: "Boolean" }
	) {
		repository(id: $repositoryId) {
			devices(
				first: $first
				after: $after
				order_by: $order_by
				filter: $filter
				showOnlyOwnDevices: $showOnlyOwnDevices
			) @connection(key: "DeviceList_devices") {
				__id
				edges {
					...DeviceTable_devices
				}
			}
		}
	}
`;

export const DeviceListGraphQLQuery = graphql`
	query DeviceListQuery($repositoryId: ID!) {
		...DeviceList @arguments(first: 25, order_by: NAME)
	}
`;

const deviceAddedOrUpdatedGraphQLSubscription = graphql`
	subscription DeviceListAddedOrUpdatedSubscription($connections: [ID!]!) {
		deviceAddedOrUpdated @appendEdge(connections: $connections) {
			...DeviceTable_devices
		}
	}
`;

const deviceRemovedGraphQLSubscription = graphql`
	subscription DeviceListRemovedSubscription($connections: [ID!]!) {
		removedNode {
			node {
				deletedId @deleteEdge(connections: $connections)
			}
		}
	}
`;

export function DeviceList(props: { queryRef: PreloadedQuery<DeviceListQuery> }) {
	const query = usePreloadedQuery(DeviceListGraphQLQuery, props.queryRef);
	const {
		data: oldData,
		refetch,
		loadNext,
		hasNext,
		isLoadingNext,
	} = usePaginationFragment<DeviceListFragment, DeviceList$key>(DeviceListGraphQLFragment, query);

	const data = oldData.repository;

	const [deviceAddDialogOpen, setDeviceAddDialogOpen] = useState(false);

	const connectionId = data.devices.__id;

	// IMPORTANT: your config should be memoized, or at least not re-computed
	// every render. Otherwise, useSubscription will re-render too frequently.
	const addOrUpdateConfig: GraphQLSubscriptionConfig<DeviceListAddedOrUpdatedSubscription> =
		useMemo(
			() => ({
				variables: { connections: [connectionId] },
				subscription: deviceAddedOrUpdatedGraphQLSubscription,
			}),
			[connectionId]
		);
	const removeConfig: GraphQLSubscriptionConfig<DeviceListRemovedSubscription> = useMemo(
		() => ({
			variables: { connections: [connectionId] },
			subscription: deviceRemovedGraphQLSubscription,
		}),
		[connectionId]
	);
	useSubscription(addOrUpdateConfig);
	useSubscription(removeConfig);

	return (
		<DeviceListTemplate
			mainAction={{ type: "addDevice", onAddAddDevice: () => setDeviceAddDialogOpen(true) }}
			selectedTab={"flat"}
		>
			{deviceAddDialogOpen && (
				<DeviceAdd
					closeModal={() => setDeviceAddDialogOpen(false)}
					connections={{ connectionIdFlat: [connectionId] }}
				/>
			)}
			<DeviceTable
				connections={[data.devices.__id]}
				devices={data.devices.edges}
				refetch={refetch}
			/>
			<EuiSpacer />
			{hasNext && (
				<EuiFlexGroup justifyContent="center">
					<EuiFlexItem grow={false}>
						<EuiButton onClick={() => loadNext(50)} isLoading={isLoadingNext}>
							Load More
						</EuiButton>
					</EuiFlexItem>
				</EuiFlexGroup>
			)}
		</DeviceListTemplate>
	);
}
