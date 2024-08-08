import {
	EuiButton,
	EuiFlexGroup,
	EuiFlexItem,
	EuiSkeletonText,
	EuiSpacer,
	EuiTable,
} from "@elastic/eui";
import React, { useMemo, useState } from "react";
import type { RefetchFnDynamic } from "react-relay";
import { graphql, usePaginationFragment, useSubscription } from "react-relay";
import type { PreloadedQuery } from "react-relay/hooks";
import { usePreloadedQuery } from "react-relay/hooks";
import type { GraphQLSubscriptionConfig } from "relay-runtime";

import { ResourceComparisonView } from "./ResourceComparisonView";
import { ResourceListHeader, ResourceListTable } from "./list/ResourceListTable";

import type { ResourceList$key } from "@/relay/ResourceList.graphql";
import type { ResourceListAddedOrUpdatedSubscription } from "@/relay/ResourceListAddedOrUpdatedSubscription.graphql";
import type { ResourceListFragment } from "@/relay/ResourceListFragment.graphql";
import type { ResourceListQuery } from "@/relay/ResourceListQuery.graphql";
import type { ResourceListRemovedSubscription } from "@/relay/ResourceListRemovedSubscription.graphql";
import { SearchEmptyPrompt } from "~/apps/desktop-app/src/components/search/list/SearchEmptyPrompt";

const ResourceListGraphQLFragment = graphql`
	fragment ResourceList on RepositoryQuery
	@refetchable(queryName: "ResourceListFragment")
	@argumentDefinitions(
		first: { type: "Int!" }
		after: { type: "String" }
		order_by: { type: "ResourceOrder" }
	) {
		repository(id: $repositoryId) {
			resources(
				first: $first
				after: $after
				rootsOnly: true
				order_by: $order_by
				filter: $filter
			) @connection(key: "ResourceList_resources") {
				__id
				edges {
					node {
						...ResourceListTableFragment
					}
				}
			}
		}
	}
`;

export const ResourceListGraphQLQuery = graphql`
	query ResourceListQuery($repositoryId: ID!, $filter: ResourcesFilterInput) {
		...ResourceList @arguments(first: 50)
	}
`;

const resourceAddedOrUpdatedGraphQLSubscription = graphql`
	subscription ResourceListAddedOrUpdatedSubscription($connections: [ID!]!) {
		resourceAddedOrUpdated @appendEdge(connections: $connections) {
			node {
				...ResourceListTableFragment
			}
		}
	}
`;

const resourceRemovedGraphQLSubscription = graphql`
	subscription ResourceListRemovedSubscription($connections: [ID!]!) {
		removedNode {
			node {
				deletedId @deleteEdge(connections: $connections)
			}
		}
	}
`;

export function ResourceList(props: {
	queryRef: PreloadedQuery<ResourceListQuery>;
	setRefetch: (refetch: () => RefetchFnDynamic<ResourceListFragment, ResourceList$key>) => void;
}) {
	const query = usePreloadedQuery(ResourceListGraphQLQuery, props.queryRef);
	const {
		refetch,
		data: fullData,
		hasNext,
		loadNext,
		isLoadingNext,
	} = usePaginationFragment<ResourceListFragment, ResourceList$key>(
		ResourceListGraphQLFragment,
		query
	);
	props.setRefetch(() => refetch);

	const data = fullData.repository;
	const connectionId = data.resources.__id;

	// IMPORTANT: your config should be memoized, or at least not re-computed
	// every render. Otherwise, useSubscription will re-render too frequently.
	const addOrUpdateConfig: GraphQLSubscriptionConfig<ResourceListAddedOrUpdatedSubscription> =
		useMemo(
			() => ({
				variables: { connections: [connectionId] },
				subscription: resourceAddedOrUpdatedGraphQLSubscription,
			}),
			[connectionId]
		);
	const removeConfig: GraphQLSubscriptionConfig<ResourceListRemovedSubscription> = useMemo(
		() => ({
			variables: { connections: [connectionId] },
			subscription: resourceRemovedGraphQLSubscription,
		}),
		[connectionId]
	);
	useSubscription(addOrUpdateConfig);
	useSubscription(removeConfig);

	// Comparison
	const [selectedResources, setSelectedResources] = useState<string[]>([]);
	const [showComparison, setShowComparison] = useState(false);

	return showComparison ? (
		<ResourceComparisonView
			onLeaveComparisonView={() => setShowComparison(false)}
			selectedResources={selectedResources}
		/>
	) : (
		<>
			{selectedResources.length > 0 && (
				<>
					<EuiFlexGroup justifyContent={"flexEnd"}>
						<EuiFlexItem grow={false}>
							<EuiButton onClick={() => setShowComparison(true)}>
								Compare {selectedResources.length} resources
							</EuiButton>
						</EuiFlexItem>
						<EuiFlexItem grow={false}>
							<EuiButton onClick={() => setSelectedResources([])}>Clear selection</EuiButton>
						</EuiFlexItem>
					</EuiFlexGroup>
					<EuiSpacer />
				</>
			)}
			{data.resources.edges.length === 0 ? (
				<SearchEmptyPrompt />
			) : (
				<ResourceListTable
					resources={data.resources.edges.flatMap((e) => e.node ?? [])}
					connections={[data.resources.__id]}
					comparison={{ selectedResources, setSelectedResources }}
					showContextMenu={true}
				/>
			)}
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

export function ResourceListLoading() {
	return (
		<>
			<EuiTable>
				<ResourceListHeader />
			</EuiTable>
			<EuiSkeletonText lines={4} />
			<EuiSpacer />
			<EuiSkeletonText lines={4} />
			<EuiSpacer />
			<EuiSkeletonText lines={4} />
		</>
	);
}
