import {
	EuiButton,
	EuiFlexGroup,
	EuiFlexItem,
	EuiPageTemplate,
	EuiPanel,
	EuiSkeletonText,
	EuiSpacer,
	EuiText,
} from "@elastic/eui";
import React, { useState } from "react";
import { graphql, useMutation } from "react-relay";
import type { PreloadedQuery } from "react-relay/hooks";
import { usePreloadedQuery } from "react-relay/hooks";

import { NameComposition } from "./NameComposition";
import { NameCompositionAdd } from "./NameCompositionAdd";
import { VariableList } from "./VariableList";
import { EDocId } from "../../interfaces/EDocId";
import { InfoHeadline } from "../InfoHeadline";
import { AdactaPageTemplate } from "../layout/AdactaPageTemplate";

import type { NameCompositionOverviewQuery } from "@/relay/NameCompositionOverviewQuery.graphql";
import type { NameCompositionOverviewUpdateMutation } from "@/relay/NameCompositionOverviewUpdateMutation.graphql";

export const NameCompositionOverviewGraphQLQuery = graphql`
	query NameCompositionOverviewQuery($repositoryId: ID!) {
		repository(id: $repositoryId) {
			deviceNameComposition {
				# Fragment is used by VariableArrangement (which is used by NameComposition)
				# eslint is not able to detect this
				# eslint-disable-next-line relay/must-colocate-fragment-spreads
				...VariableArrangementAvailableVariables
				variables {
					__id
					...VariableList
				}
				composition {
					__id
					edges {
						node {
							...NameComposition
						}
					}
				}
			}
		}
	}
`;

export function NameCompositionOverview(props: {
	queryRef: PreloadedQuery<NameCompositionOverviewQuery>;
}) {
	const [commitUpdate] = useMutation<NameCompositionOverviewUpdateMutation>(graphql`
		mutation NameCompositionOverviewUpdateMutation(
			$update: Update_NameCompositionInput!
			$repositoryId: ID!
		) {
			repository(id: $repositoryId) {
				upsertNameComposition(update: $update) {
					node {
						node {
							id
							...VariableArrangement
						}
						query {
							variables {
								edges {
									node {
										id
										deletable
									}
								}
							}
						}
					}
				}
			}
		}
	`);

	const data = usePreloadedQuery(NameCompositionOverviewGraphQLQuery, props.queryRef);
	const { deviceNameComposition } = data.repository;
	const [showAddComposition, setShowAddComposition] = useState(false);

	return (
		<AdactaPageTemplate>
			<EuiPageTemplate.Header
				pageTitle={
					<InfoHeadline size={"l"} name="Name Compositions" docId={EDocId.NAMECOMPOSITIONS} />
				}
				rightSideItems={[
					<EuiButton
						fill
						key={"addComposition"}
						onClick={() => {
							setShowAddComposition(true);
						}}
					>
						Create Name-Composition
					</EuiButton>,
				]}
			/>
			<EuiPageTemplate.Section>
				{showAddComposition && (
					<NameCompositionAdd
						onClose={() => setShowAddComposition(false)}
						connections={[deviceNameComposition.composition.__id]}
					/>
				)}
				<EuiFlexGroup>
					<EuiFlexItem grow={6}>
						<>
							{deviceNameComposition.composition.edges.map((d, i) => (
								<>
									<EuiPanel hasShadow={false} color="subdued">
										<NameComposition
											key={i}
											connections={[deviceNameComposition.composition.__id]}
											data={d.node}
											commitUpdate={commitUpdate}
											availableVariables={deviceNameComposition}
										/>
									</EuiPanel>
									<EuiSpacer />
								</>
							))}
						</>
					</EuiFlexItem>
					<EuiFlexItem grow={2}>
						<EuiPanel>
							<EuiText>
								<h2>Variables</h2>
							</EuiText>
							<VariableList
								data={deviceNameComposition.variables}
								connections={[deviceNameComposition.variables.__id]}
							/>
						</EuiPanel>
					</EuiFlexItem>
				</EuiFlexGroup>
			</EuiPageTemplate.Section>
		</AdactaPageTemplate>
	);
}

export function NameCompositionOverviewLoading() {
	return (
		<AdactaPageTemplate>
			<EuiPageTemplate.Header
				pageTitle={
					<InfoHeadline size={"l"} name="Name Compositions" docId={EDocId.NAMECOMPOSITIONS} />
				}
			/>
			<EuiPageTemplate.Section>
				<EuiFlexGroup>
					<EuiFlexItem grow={6}>
						<EuiSkeletonText lines={10} />
					</EuiFlexItem>
					<EuiFlexItem grow={2}>
						<EuiPanel>
							<EuiText>
								<h2>Variables</h2>
							</EuiText>
							<EuiSkeletonText lines={10} />
						</EuiPanel>
					</EuiFlexItem>
				</EuiFlexGroup>
			</EuiPageTemplate.Section>
		</AdactaPageTemplate>
	);
}
