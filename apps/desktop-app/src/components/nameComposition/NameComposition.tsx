import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from "@elastic/eui";
import type { Disposable } from "graphql-ws";
import type { ReactNode } from "react";
import React from "react";
import { useMutation } from "react-relay";
import type { UseMutationConfig } from "react-relay/hooks";
import { graphql, useFragment } from "react-relay/hooks";

import { NameCompositionContextMenu } from "./NameCompositionContextMenu";
import { LegacyNameId, ShortIdId, VariableArrangement } from "./VariableArrangement";
import type { PropsWithConnections } from "../../interfaces/PropsWithConnections";
import { useRepositoryId } from "../../services/router/UseRepoId";
import { AdactaIcon } from "../icons/AdactaIcon";

import type { NameComposition$key } from "@/relay/NameComposition.graphql";
import type { NameCompositionOverviewUpdateMutation } from "@/relay/NameCompositionOverviewUpdateMutation.graphql";
import type { VariableArrangementAvailableVariables$key } from "@/relay/VariableArrangementAvailableVariables.graphql";
import { INameCompositionType } from "~/apps/repo-server/src/graphql/generated/requests";

export function NameComposition(
	props: PropsWithConnections<{
		data: NameComposition$key;
		commitUpdate: (config: UseMutationConfig<NameCompositionOverviewUpdateMutation>) => Disposable;
		availableVariables: VariableArrangementAvailableVariables$key;
	}>
) {
	const nameCompositionData = useFragment(
		graphql`
			fragment NameComposition on NameComposition {
				id
				name
				usageType
				...VariableArrangement
			}
		`,
		props.data
	);
	const repositoryId = useRepositoryId();

	const [deleteCompositionMutation] = useMutation(graphql`
		mutation NameCompositionDeleteMutation($id: ID!, $repositoryId: ID!, $connections: [ID!]!) {
			repository(id: $repositoryId) {
				deleteNameComposition(id: $id) {
					deletedId @deleteEdge(connections: $connections)
				}
			}
		}
	`);

	const deleteComposition = () => {
		deleteCompositionMutation({
			variables: { id: nameCompositionData.id, repositoryId, connections: props.connections },
		});
	};

	const DefaultIndicator = (props: { type: "Sample" | "Device" }) => (
		<>
			<EuiFlexGroup direction={"row"} alignItems={"center"} gutterSize={"s"}>
				<EuiFlexItem grow={false}>
					<AdactaIcon type={props.type} />
				</EuiFlexItem>
				<EuiFlexItem>
					<EuiText size={"xs"} color={"subdued"}>
						This naming scheme is used as default for all {props.type}s in this repository
					</EuiText>
				</EuiFlexItem>
			</EuiFlexGroup>
			<EuiSpacer size={"s"} />
		</>
	);

	const defaultIndicator: ReactNode[] = [];

	if (
		nameCompositionData.usageType == INameCompositionType.DefaultDevices ||
		nameCompositionData.usageType == INameCompositionType.DefaultDevicesAndSamples
	) {
		defaultIndicator.push(<DefaultIndicator key={"Device"} type={"Device"} />);
	}
	if (
		nameCompositionData.usageType == INameCompositionType.DefaultSamples ||
		nameCompositionData.usageType == INameCompositionType.DefaultDevicesAndSamples
	) {
		defaultIndicator.push(<DefaultIndicator key={"Sample"} type={"Sample"} />);
	}

	return (
		<>
			<EuiFlexGroup direction={"column"} gutterSize={"s"}>
				<EuiFlexItem grow={false}>
					<EuiText>
						<h3>{nameCompositionData.name}</h3>
					</EuiText>
				</EuiFlexItem>
				<EuiFlexItem grow={false}>{defaultIndicator}</EuiFlexItem>
			</EuiFlexGroup>

			<EuiFlexGroup alignItems={"center"}>
				<EuiFlexItem grow={true}>
					<VariableArrangement
						data={nameCompositionData}
						availableVariables={props.availableVariables}
						updateVariables={(newOrder, removedVar) => {
							// If the index is -1, the legacy name is not used. In this case we send
							// null as the index to indicate that the legacy name should be removed
							let legacyNameIndex: number | null = newOrder.indexOf(LegacyNameId);
							legacyNameIndex = legacyNameIndex == -1 ? null : legacyNameIndex;

							let shortIdIndex: number | null = newOrder.indexOf(ShortIdId);
							shortIdIndex = shortIdIndex == -1 ? null : shortIdIndex;

							props.commitUpdate({
								variables: {
									repositoryId,
									update: {
										id: nameCompositionData.id,
										input: {
											variables: newOrder.filter((v) => v != LegacyNameId && v != ShortIdId),
											legacyNameIndex: legacyNameIndex,
											shortIdIndex: shortIdIndex,
										},
									},
								},
								updater: (store) => {
									if (removedVar) {
										store.get(removedVar)?.invalidateRecord();
									}
								},
							});
						}}
					/>
				</EuiFlexItem>
				<EuiFlexItem grow={false}>
					<NameCompositionContextMenu
						nameCompositionId={nameCompositionData.id}
						deleteComposition={deleteComposition}
					/>
				</EuiFlexItem>
			</EuiFlexGroup>
			<EuiSpacer />
		</>
	);
}
