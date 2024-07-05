import { EuiButton, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPageTemplate } from "@elastic/eui";
import React, { useMemo, useState } from "react";
import { graphql, usePaginationFragment, useSubscription } from "react-relay";
import type { PreloadedQuery } from "react-relay/hooks";
import { usePreloadedQuery } from "react-relay/hooks";
import type { GraphQLSubscriptionConfig } from "relay-runtime";

import { SampleAdd } from "./SampleAdd";
import { SampleTable } from "./SampleTable";
import { EDocId } from "../../interfaces/EDocId";
import { useService } from "../../services/ServiceProvider";
import { DocFlyoutService } from "../../services/toaster/FlyoutService";
import { AdactaPageTemplate } from "../layout/AdactaPageTemplate";
import { ManageNameCompositionButton } from "../nameComposition/ManageNameCompositionButton";

import type { SampleList$key } from "@/relay/SampleList.graphql";
import type { SampleListAddedOrUpdatedSubscription } from "@/relay/SampleListAddedOrUpdatedSubscription.graphql";
import type { SampleListFragment } from "@/relay/SampleListFragment.graphql";
import type { SampleListQuery } from "@/relay/SampleListQuery.graphql";
import type { SampleListRemovedSubscription } from "@/relay/SampleListRemovedSubscription.graphql";

const SampleListGraphQLFragment = graphql`
	fragment SampleList on RepositoryQuery
	@refetchable(queryName: "SampleListFragment")
	@argumentDefinitions(first: { type: "Int!" }, after: { type: "String" }) {
		repository(id: $repositoryId) {
			samples(first: $first, after: $after, rootsOnly: true)
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
	query SampleListQuery($repositoryId: ID!) {
		...SampleList @arguments(first: 50)
	}
`;

export function SampleList(props: { queryRef: PreloadedQuery<SampleListQuery> }) {
	const query = usePreloadedQuery(SampleListGraphQLQuery, props.queryRef);
	const { data: fullData } = usePaginationFragment<SampleListFragment, SampleList$key>(
		SampleListGraphQLFragment,
		query
	);
	const data = fullData.repository;

	const [sampleAddDialogOpen, setSampleAddDialogOpen] = useState(false);

	const connectionId = data.samples.__id;

	const docFlyoutService = useService(DocFlyoutService);

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
		<AdactaPageTemplate>
			<EuiPageTemplate.Header
				pageTitle={
					<EuiFlexGroup alignItems="baseline" gutterSize="xs">
						<EuiFlexItem grow={false}>Samples</EuiFlexItem>
						<EuiFlexItem grow={false}>
							<EuiButtonIcon
								aria-label={"Open Documentation"}
								color="text"
								iconType="questionInCircle"
								onClick={() => docFlyoutService.showDoc(EDocId.SAMPLES)}
							/>
						</EuiFlexItem>
					</EuiFlexGroup>
				}
				rightSideItems={[
					<EuiButton fill key="add" onClick={() => setSampleAddDialogOpen(true)}>
						Add sample
					</EuiButton>,
					<ManageNameCompositionButton key={"manageNameComposition"} />,
				]}
			/>
			<EuiPageTemplate.Section>
				{sampleAddDialogOpen && (
					<SampleAdd closeModal={() => setSampleAddDialogOpen(false)} connectionId={connectionId} />
				)}
				<SampleTable samples={samples} connectionId={connectionId} />
			</EuiPageTemplate.Section>
		</AdactaPageTemplate>
	);
}
