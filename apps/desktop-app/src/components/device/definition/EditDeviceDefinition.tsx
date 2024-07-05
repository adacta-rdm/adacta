import type { UnitKind } from "@omegadot/einheiten/dist/types/quantities/kind";
import React, { useState } from "react";
import type { GraphQLTaggedNode } from "react-relay";
import {
	graphql,
	useLazyLoadQuery,
	useMutation,
	useSubscribeToInvalidationState,
} from "react-relay";

import { DeviceDefinitionEditor } from "./DeviceDefinitionEditor";
import { useRepositoryIdVariable } from "../../../services/router/UseRepoId";
import { DeviceImageEditor } from "../DeviceImageEditor";
import { ImageList } from "../ImageList";

import type { EditDeviceDefinitionMutation } from "@/relay/EditDeviceDefinitionMutation.graphql";
import type { EditDeviceDefinitionQuery } from "@/relay/EditDeviceDefinitionQuery.graphql";
import { assertUnitKinds } from "~/lib/assertUnitKind";
import type { IDeviceDefinitionId } from "~/lib/database/Ids";
import type { ISpecification } from "~/lib/database/documents/interfaces/ISpecification";

const EditDeviceDefinitionGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation EditDeviceDefinitionMutation($input: EditDeviceDefinitionInput!, $repositoryId: ID!) {
		repository(id: $repositoryId) {
			editDeviceDefinition(input: $input) {
				... on DeviceDefinition {
					acceptsUnit
					specifications {
						name
						value
					}
					...DeviceDefinitionListEntry
				}
				... on Error {
					message
				}
			}
		}
	}
`;

const EditDeviceDefinitionGraphQLQuery: GraphQLTaggedNode = graphql`
	query EditDeviceDefinitionQuery($deviceDefinitionId: ID!, $repositoryId: ID!) {
		repository(id: $repositoryId) {
			deviceDefinition(id: $deviceDefinitionId) {
				id
				name
				acceptsUnit
				specifications {
					name
					value
				}
				definitions {
					level
					definition {
						id
					}
				}
				...DeviceImageEditor
				...ImageList
			}
		}
	}
`;

export function EditDeviceDefinition(props: { closeModal: () => void; id: IDeviceDefinitionId }) {
	const [fetchKey, setFetchKey] = useState(0);

	const repositoryIdVariable = useRepositoryIdVariable();
	const { repository } = useLazyLoadQuery<EditDeviceDefinitionQuery>(
		EditDeviceDefinitionGraphQLQuery,
		{
			deviceDefinitionId: props.id,
			...repositoryIdVariable,
		},
		{ fetchKey: fetchKey }
	);
	const { deviceDefinition } = repository;
	const [error, setError] = useState<undefined | string>(undefined);
	const [editImages, setEditImages] = useState(false);

	useSubscribeToInvalidationState([props.id], () => {
		setFetchKey(fetchKey + 1);
	});

	const [editDeviceMutation, inFlight] = useMutation<EditDeviceDefinitionMutation>(
		EditDeviceDefinitionGraphQLMutation
	);
	const editDeviceDefinition = (
		name: string,
		parentDeviceDefinition: IDeviceDefinitionId | undefined,
		specifications: ISpecification[],
		acceptedUnits: UnitKind[]
	) => {
		editDeviceMutation({
			variables: {
				input: { id: props.id, parentDeviceDefinition, name, specifications, acceptedUnits },
				...repositoryIdVariable,
			},
			updater: (store) => {
				const oldDefinitions = deviceDefinition.definitions
					.filter((d) => d.level == 0)
					.map((d) => d.definition.id);
				// Invalidate store if the parentDeviceDefinitions have changed
				// Currently we are invalidating the entire store. It is not practical to identify
				// only the affected entries in the store (to do this you would have to
				// re-traverse the new tree).
				// A potentially viable approach would be to invalidate all device definitions.
				// Unfortunately there seems to be no way to find all entries of a certain type.
				if (oldDefinitions[0] != parentDeviceDefinition) {
					store.invalidateStore();
				}
			},
			onCompleted: (response) => {
				if (response.repository.editDeviceDefinition.message === undefined) {
					setError(undefined);
					props.closeModal();
				} else {
					setError(response.repository.editDeviceDefinition.message);
				}
			},
		});
	};

	const specifications = deviceDefinition.specifications.map(
		(s): ISpecification => ({ name: s.name, value: s.value })
	);

	assertUnitKinds(deviceDefinition.acceptsUnit);

	return (
		<>
			{editImages ? (
				<DeviceImageEditor
					deviceOrDeviceDefinition={deviceDefinition}
					closeModal={() => setEditImages(false)}
				/>
			) : (
				<DeviceDefinitionEditor
					closeModal={props.closeModal}
					onSubmitEdit={editDeviceDefinition}
					isLoading={inFlight}
					initialDefinitionName={deviceDefinition.name}
					initialSpecifications={specifications}
					initialAcceptsUnits={deviceDefinition.acceptsUnit}
					deviceDefinition={deviceDefinition.definitions.find((d) => d.level === 1)?.definition.id}
					error={error}
					onEditImages={() => setEditImages(true)}
					renderedImages={<ImageList images={deviceDefinition} />}
					deviceDefinitionId={deviceDefinition.id as IDeviceDefinitionId}
				/>
			)}
		</>
	);
}
