import {
	EuiButton,
	EuiButtonIcon,
	EuiFlexGroup,
	EuiFlexItem,
	EuiPageTemplate,
	EuiSpacer,
} from "@elastic/eui";
import React, { useMemo, useState } from "react";
import { graphql, usePaginationFragment, useSubscription } from "react-relay";
import type { PreloadedQuery } from "react-relay/hooks";
import { usePreloadedQuery } from "react-relay/hooks";
import type { GraphQLSubscriptionConfig } from "relay-runtime";

import { ResourceComparisonView } from "./ResourceComparisonView";
import { ResourceListTable } from "./list/ResourceListTable";
import { EDocId } from "../../interfaces/EDocId";
import { useService } from "../../services/ServiceProvider";
import { DocFlyoutService } from "../../services/toaster/FlyoutService";
import { AdactaPageTemplate } from "../layout/AdactaPageTemplate";

import type { ResourceList$key } from "@/relay/ResourceList.graphql";
import type { ResourceListAddedOrUpdatedSubscription } from "@/relay/ResourceListAddedOrUpdatedSubscription.graphql";
import type { ResourceListFragment } from "@/relay/ResourceListFragment.graphql";
import type { ResourceListQuery } from "@/relay/ResourceListQuery.graphql";
import type { ResourceListRemovedSubscription } from "@/relay/ResourceListRemovedSubscription.graphql";

const ResourceListGraphQLFragment = graphql`
	fragment ResourceList on RepositoryQuery
	@refetchable(queryName: "ResourceListFragment")
	@argumentDefinitions(
		first: { type: "Int!" }
		after: { type: "String" }
		order_by: { type: "ResourceOrder" }
	) {
		repository(id: $repositoryId) {
			resources(first: $first, after: $after, rootsOnly: true, order_by: $order_by)
				@connection(key: "ResourceList_resources") {
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
	query ResourceListQuery($repositoryId: ID!) {
		...ResourceList @arguments(first: 500)
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

export function ResourceList(props: { queryRef: PreloadedQuery<ResourceListQuery> }) {
	const query = usePreloadedQuery(ResourceListGraphQLQuery, props.queryRef);
	const { data: fullData } = usePaginationFragment<ResourceListFragment, ResourceList$key>(
		ResourceListGraphQLFragment,
		query
	);

	const data = fullData.repository;
	const connectionId = data.resources.__id;

	const docFlyoutService = useService(DocFlyoutService);

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

	return (
		<AdactaPageTemplate>
			<EuiPageTemplate.Header
				pageTitle={
					<EuiFlexGroup alignItems="baseline" gutterSize="xs">
						<EuiFlexItem grow={false}>Resources</EuiFlexItem>
						<EuiFlexItem grow={false}>
							<EuiButtonIcon
								aria-label={"Open Documentation"}
								color="text"
								iconType="questionInCircle"
								onClick={() => docFlyoutService.showDoc(EDocId.RESOURCES)}
							/>
						</EuiFlexItem>
					</EuiFlexGroup>
				}
			/>
			<EuiPageTemplate.Section>
				{showComparison ? (
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
						<ResourceListTable
							resources={data.resources.edges.flatMap((e) => e.node ?? [])}
							connections={[data.resources.__id]}
							comparison={{ selectedResources, setSelectedResources }}
							showContextMenu={true}
						/>
					</>
				)}
			</EuiPageTemplate.Section>
		</AdactaPageTemplate>
	);
}
