import { EuiSkeletonText, EuiSpacer, EuiTable } from "@elastic/eui";
import React, { useMemo } from "react";
import {
	graphql,
	type RefetchFnDynamic,
	usePaginationFragment,
	useSubscription,
} from "react-relay";
import type { PreloadedQuery } from "react-relay/hooks";
import { usePreloadedQuery } from "react-relay/hooks";
import type { GraphQLSubscriptionConfig } from "relay-runtime";

import { SampleAdd } from "./SampleAdd";
import { SampleTable, SampleTableHeader } from "./SampleTable";

import type { SampleList$key } from "@/relay/SampleList.graphql";
import type { SampleListAddedOrUpdatedSubscription } from "@/relay/SampleListAddedOrUpdatedSubscription.graphql";
import type { SampleListFragment } from "@/relay/SampleListFragment.graphql";
import type { SampleListQuery } from "@/relay/SampleListQuery.graphql";
import type { SampleListRemovedSubscription } from "@/relay/SampleListRemovedSubscription.graphql";
import { SearchEmptyPrompt } from "~/apps/desktop-app/src/components/search/list/SearchEmptyPrompt";

const SampleListGraphQLFragment = graphql`
	fragment SampleList on RepositoryQuery
	@refetchable(queryName: "SampleListFragment")
	@argumentDefinitions(first: { type: "Int!" }, after: { type: "String" }) {
		repository(id: $repositoryId) {
			samples(first: $first, after: $after, rootsOnly: true, filter: $filter)
				@connection(key: "SampleList_samples") {
				__id
				edges {
					node {
						...SampleTable_samples
					}
				}
			}
		}
	}
`;

const sampleAddedOrUpdatedGraphQLSubscription = graphql`
	subscription SampleListAddedOrUpdatedSubscription($connections: [ID!]!) {
		sampleAddedOrUpdated @appendEdge(connections: $connections) {
			node {
				...SampleTable_samples
			}
		}
	}
`;

const sampleRemovedGraphQLSubscription = graphql`
	subscription SampleListRemovedSubscription($connections: [ID!]!) {
		removedNode {
			node {
				deletedId @deleteEdge(connections: $connections)
			}
		}
	}
`;

export const SampleListGraphQLQuery = graphql`
	query SampleListQuery($repositoryId: ID!, $filter: SamplesFilterInput) {
		...SampleList @arguments(first: 50)
	}
`;

export function SampleList(props: {
	queryRef: PreloadedQuery<SampleListQuery>;
	sampleAddDialogOpen: boolean;
	setSampleAddDialogOpen: (open: boolean) => void;
	setRefetch: (refetch: () => RefetchFnDynamic<SampleListFragment, SampleList$key>) => void;
}) {
	const query = usePreloadedQuery(SampleListGraphQLQuery, props.queryRef);
	const { data: fullData, refetch } = usePaginationFragment<SampleListFragment, SampleList$key>(
		SampleListGraphQLFragment,
		query
	);
	props.setRefetch(() => refetch);
	const data = fullData.repository;

	const connectionId = data.samples.__id;

	// IMPORTANT: your config should be memoized, or at least not re-computed
	// every render. Otherwise, useSubscription will re-render too frequently.
	const addOrUpdateConfig: GraphQLSubscriptionConfig<SampleListAddedOrUpdatedSubscription> =
		useMemo(
			() => ({
				variables: { connections: [connectionId] },
				subscription: sampleAddedOrUpdatedGraphQLSubscription,
			}),
			[connectionId]
		);
	const removeConfig: GraphQLSubscriptionConfig<SampleListRemovedSubscription> = useMemo(
		() => ({
			variables: { connections: [connectionId] },
			subscription: sampleRemovedGraphQLSubscription,
		}),
		[connectionId]
	);
	useSubscription(addOrUpdateConfig);
	useSubscription(removeConfig);

	const samples = data.samples.edges.map((e) => e.node);

	return (
		<>
			{props.sampleAddDialogOpen && (
				<SampleAdd
					closeModal={() => props.setSampleAddDialogOpen(false)}
					connectionId={connectionId}
				/>
			)}
			{data.samples.edges.length === 0 ? (
				<SearchEmptyPrompt />
			) : (
				<SampleTable samples={samples} connectionId={connectionId} />
			)}
		</>
	);
}

export const SampleListLoading = () => {
	return (
		<>
			<EuiTable>
				<SampleTableHeader disableActions={true} />
			</EuiTable>
			<EuiSkeletonText lines={4} />
			<EuiSpacer />
			<EuiSkeletonText lines={4} />
			<EuiSpacer />
			<EuiSkeletonText lines={4} />
		</>
	);
};
