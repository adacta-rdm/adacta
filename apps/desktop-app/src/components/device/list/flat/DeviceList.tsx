import {
	EuiButton,
	EuiFlexGroup,
	EuiFlexItem,
	EuiSkeletonText,
	EuiSpacer,
	EuiTable,
} from "@elastic/eui";
import React, { useMemo } from "react";
import type { RefetchFnDynamic } from "react-relay";
import { graphql, usePaginationFragment, useSubscription } from "react-relay";
import type { PreloadedQuery } from "react-relay/hooks";
import { usePreloadedQuery } from "react-relay/hooks";
import type { GraphQLSubscriptionConfig } from "relay-runtime";

import { DeviceTable, DeviceTableHeader } from "./DeviceTable";
import { DeviceAdd } from "../../DeviceAdd";

import type { DeviceList$key } from "@/relay/DeviceList.graphql";
import type { DeviceListAddedOrUpdatedSubscription } from "@/relay/DeviceListAddedOrUpdatedSubscription.graphql";
import type { DeviceListFragment } from "@/relay/DeviceListFragment.graphql";
import type { DeviceListQuery } from "@/relay/DeviceListQuery.graphql";
import type { DeviceListRemovedSubscription } from "@/relay/DeviceListRemovedSubscription.graphql";

export const DeviceListGraphQLFragment = graphql`
	fragment DeviceList on RepositoryQuery
	@refetchable(queryName: "DeviceListFragment")
	@argumentDefinitions(
		first: { type: "Int!" }
		after: { type: "String" }
		order_by: { type: "DeviceOrder" }
		usage: { type: "DevicesUsage" }
	) {
		repository(id: $repositoryId) {
			devices(first: $first, after: $after, order_by: $order_by, usage: $usage, filter: $filter)
				@connection(key: "DeviceList_devices") {
				__id
				edges {
					...DeviceTable_devices
				}
			}
		}
	}
`;

export const DeviceListGraphQLQuery = graphql`
	query DeviceListQuery($repositoryId: ID!, $filter: DevicesFilterInput) {
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

export function DeviceList(props: {
	queryRef: PreloadedQuery<DeviceListQuery>;
	deviceAddDialogOpen: boolean;
	setDeviceAddDialogOpen: (e: boolean) => void;
	setRefetch: (refetch: () => RefetchFnDynamic<DeviceListFragment, DeviceList$key>) => void;
}) {
	const query = usePreloadedQuery(DeviceListGraphQLQuery, props.queryRef);
	const {
		data: oldData,
		refetch,
		loadNext,
		hasNext,
		isLoadingNext,
	} = usePaginationFragment<DeviceListFragment, DeviceList$key>(DeviceListGraphQLFragment, query);
	props.setRefetch(() => refetch);

	const data = oldData.repository;

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
		<>
			{props.deviceAddDialogOpen && (
				<DeviceAdd
					closeModal={() => props.setDeviceAddDialogOpen(false)}
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
		</>
	);
}
export function DeviceListLoading({ disableActions }: { disableActions?: boolean }) {
	return (
		<>
			<EuiSpacer size={"m"} />
			<EuiTable>
				<DeviceTableHeader sortDirection={"asc"} disableActions={disableActions} />
			</EuiTable>
			<EuiSkeletonText lines={4} />
			<EuiSpacer />
			<EuiSkeletonText lines={4} />
			<EuiSpacer />
			<EuiSkeletonText lines={4} />
		</>
	);
}
