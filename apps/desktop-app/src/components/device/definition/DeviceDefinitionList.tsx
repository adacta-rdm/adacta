import {
	EuiBadge,
	EuiButton,
	EuiFlexGroup,
	EuiFlexItem,
	EuiModal,
	EuiModalBody,
	EuiModalFooter,
	EuiModalHeader,
	EuiModalHeaderTitle,
	EuiTable,
	EuiTableBody,
	EuiTableHeader,
	EuiTableHeaderCell,
	EuiTableRow,
	EuiTableRowCell,
} from "@elastic/eui";
import React, { useState } from "react";
import {
	graphql,
	useMutation,
	useRefetchableFragment,
	useSubscribeToInvalidationState,
} from "react-relay";
import type { PreloadedQuery } from "react-relay/hooks";
import { usePreloadedQuery } from "react-relay/hooks";

import { AddDeviceDefinition } from "./AddDeviceDefinition";
import { DeviceDefinitionContextMenu } from "./DeviceDefinitionContextMenu";
import { EditDeviceDefinition } from "./EditDeviceDefinition";
import { useRepositoryId } from "../../../services/router/UseRepoId";
import { connectionToArray } from "../../../utils/connectionToArray";
import { sortDeviceDefinitions } from "../../../utils/sortDeviceDefinitions";
import { UserLink } from "../../user/UserLink";
import { PaddingHelper } from "../../utils/PaddingHelper";
import { DeviceListTemplate } from "../list/DeviceListTemplate";

import type { DeviceDefinitionListEntry$key } from "@/relay/DeviceDefinitionListEntry.graphql";
import type { DeviceDefinitionListEntryDeleteMutation } from "@/relay/DeviceDefinitionListEntryDeleteMutation.graphql";
import type { DeviceDefinitionListQuery } from "@/relay/DeviceDefinitionListQuery.graphql";
import { AdactaImage } from "~/apps/desktop-app/src/components/image/AdactaImage";
import type { IDeviceDefinitionId } from "~/lib/database/Ids";

export const DeviceDefinitionListGraphQLQuery = graphql`
	query DeviceDefinitionListQuery($repositoryId: ID!) {
		repository(id: $repositoryId) {
			deviceDefinitions {
				__id
				# eslint-disable-next-line relay/unused-fields (See: connectionToArray)
				edges {
					node {
						id

						name

						# To calculate the hierarchy
						definitions {
							level
							definition {
								name # TODO: Remove
								id
							}
						}

						...DeviceDefinitionListEntry
					}
				}
			}
		}
	}
`;

export function DeviceDefinitionList(props: {
	queryRef: PreloadedQuery<DeviceDefinitionListQuery>;
}) {
	const data = usePreloadedQuery(DeviceDefinitionListGraphQLQuery, props.queryRef);
	const [showEditorForId, setShowEditorForId] = useState<string | undefined>(undefined);
	const [showAddModal, setShowAddModal] = useState(false);

	const onAddAddDeviceDefinition = () => {
		setShowAddModal(true);
	};

	const definitionsArray = sortDeviceDefinitions(
		connectionToArray(data.repository.deviceDefinitions)
	);

	return (
		<DeviceListTemplate
			selectedTab={"deviceDefinitions"}
			mainAction={{
				type: "addDeviceDefinition",
				onAddAddDeviceDefinition: onAddAddDeviceDefinition,
			}}
		>
			{showAddModal && (
				<AddDeviceDefinition
					closeModal={() => setShowAddModal(false)}
					connections={[data.repository.deviceDefinitions.__id]}
				/>
			)}
			<EuiTable>
				<EuiTableHeader>
					<EuiTableHeaderCell>Name</EuiTableHeaderCell>
					<EuiTableHeaderCell>Records data</EuiTableHeaderCell>
					<EuiTableHeaderCell>Creator</EuiTableHeaderCell>
					<EuiTableHeaderCell>Actions</EuiTableHeaderCell>
				</EuiTableHeader>
				<EuiTableBody>
					{showEditorForId && (
						<EditDeviceDefinition
							closeModal={() => setShowEditorForId(undefined)}
							id={showEditorForId as IDeviceDefinitionId}
						/>
					)}
					{definitionsArray.map((d) => (
						<ListEntry
							key={d.id}
							deviceDefinition={d}
							setShowEditorForId={setShowEditorForId}
							connection={data.repository.deviceDefinitions.__id}
						/>
					))}
				</EuiTableBody>
			</EuiTable>
		</DeviceListTemplate>
	);
}

function ListEntry(props: {
	deviceDefinition: DeviceDefinitionListEntry$key;
	setShowEditorForId: (id: string) => void;
	connection: string;
}) {
	const repositoryId = useRepositoryId();
	const [data, refetch] = useRefetchableFragment(
		graphql`
			fragment DeviceDefinitionListEntry on DeviceDefinition
			@refetchable(queryName: "DeviceDefinitionListEntryRefetchQuery") {
				id
				name
				imageResource {
					...AdactaImageFragment @arguments(preset: ICON)
				}
				usages {
					__typename
				}
				definitions {
					# eslint-disable-next-line relay/unused-fields
					level
					definition {
						id
						name
						acceptsUnit
					}
				}
				metadata {
					creator {
						...UserLink
					}
				}
			}
		`,
		props.deviceDefinition
	);

	const [showError, setShowError] = useState<undefined | string>();

	const [commitDelete] = useMutation<DeviceDefinitionListEntryDeleteMutation>(graphql`
		mutation DeviceDefinitionListEntryDeleteMutation(
			$id: ID!
			$repositoryId: ID!
			$connections: [ID!]!
		) {
			repository(id: $repositoryId) {
				deleteDeviceDefinition(id: $id) {
					... on DeletedNode {
						__typename
						deletedId @deleteEdge(connections: $connections)
					}
					... on Error {
						__typename
						message
					}
				}
			}
		}
	`);

	const deleteDefinition = () => {
		commitDelete({
			variables: { id: data.id, connections: [props.connection], repositoryId },
			onCompleted: (result) => {
				const deleteDeviceDefinition = result.repository.deleteDeviceDefinition;
				if (deleteDeviceDefinition.__typename == "Error") {
					setShowError(deleteDeviceDefinition.message);
				}
			},
		});
	};

	const definitions = data.definitions;

	const units = [...new Set(definitions.flatMap((d) => d.definition.acceptsUnit))];

	// Subscribe to the invalidation of all related definitions to be able to refetch the data to
	// get a updated list of related definitions
	const relatedDefinitions = definitions.map((d) => d.definition.id);
	useSubscribeToInvalidationState(relatedDefinitions, () => {
		refetch({});
	});

	return (
		<EuiTableRow key={data.id}>
			{showError !== undefined && (
				<EuiModal onClose={() => setShowError(undefined)}>
					<EuiModalHeader>
						<EuiModalHeaderTitle>Error on deletion</EuiModalHeaderTitle>
					</EuiModalHeader>

					<EuiModalBody>{showError}</EuiModalBody>

					<EuiModalFooter>
						<EuiButton onClick={() => setShowError(undefined)} fill>
							Close
						</EuiButton>
					</EuiModalFooter>
				</EuiModal>
			)}
			<EuiTableRowCell>
				<PaddingHelper level={data.definitions.length}>
					<EuiFlexGroup gutterSize={"s"}>
						{data.imageResource[0] !== undefined ? (
							<AdactaImage alt={`${data.name} preview`} image={data.imageResource[0]} icon={true} />
						) : null}
						<EuiFlexItem grow={true}> {data.name}</EuiFlexItem>
					</EuiFlexGroup>
				</PaddingHelper>
			</EuiTableRowCell>
			<EuiTableRowCell>
				{units.map((unit) => (
					<EuiBadge key={unit}>{unit}</EuiBadge>
				))}
			</EuiTableRowCell>
			<EuiTableRowCell>
				<UserLink user={data.metadata.creator} />
			</EuiTableRowCell>
			<EuiTableRowCell>
				<DeviceDefinitionContextMenu
					deleteDefinition={deleteDefinition}
					deleteDefinitionDisableReason={
						data.usages.length
							? "This Device-Type cannot be deleted because it is still in use (either as a Type of a Device or another Device Type is defined as a Sub-Type of this Device-Type)"
							: undefined
					}
					editDefinition={() => props.setShowEditorForId(data.id)}
					name={data.name}
				/>
			</EuiTableRowCell>
		</EuiTableRow>
	);
}
