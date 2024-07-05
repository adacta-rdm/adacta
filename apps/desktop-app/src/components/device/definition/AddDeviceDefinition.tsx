import type { UnitKind } from "@omegadot/einheiten/dist/types/quantities/kind";
import React, { useState } from "react";
import type { GraphQLTaggedNode } from "react-relay";
import { graphql, useMutation } from "react-relay";

import { DeviceDefinitionEditor } from "./DeviceDefinitionEditor";
import { useRepositoryIdVariable } from "../../../services/router/UseRepoId";

import type { AddDeviceDefinitionMutation } from "@/relay/AddDeviceDefinitionMutation.graphql";
import type { IDeviceDefinitionId } from "~/lib/database/Ids";
import type { ISpecification } from "~/lib/database/documents/interfaces/ISpecification";

const AddDeviceDefinitionGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation AddDeviceDefinitionMutation(
		$repositoryId: ID!
		$input: AddDeviceDefinitionInput!
		$connections: [ID!]!
	) {
		repository(id: $repositoryId) {
			addDeviceDefinition(input: $input)
				@appendNode(edgeTypeName: "Edge_DeviceDefinition", connections: $connections) {
				id
				...DeviceDefinitionListEntry
			}
		}
	}
`;

export function AddDeviceDefinition(props: {
	/**
	 * onClose callback for the modal
	 * @param definitionId if a DeviceDefinition was created this callback contains the ID of the
	 * DeviceDefinition
	 */
	closeModal: (definitionId?: string) => void;
	connections?: string[];
}) {
	const repositoryIdVariable = useRepositoryIdVariable();
	const [addDeviceDefinitionMutation, inFlight] = useMutation<AddDeviceDefinitionMutation>(
		AddDeviceDefinitionGraphQLMutation
	);
	const [skipRendering, setSkipRendering] = useState(false);

	const addDeviceDefinition = (
		name: string,
		parentDeviceDefinition: IDeviceDefinitionId | undefined,
		specifications: ISpecification[],
		acceptedUnits: UnitKind[]
	) => {
		addDeviceDefinitionMutation({
			variables: {
				input: { name, specifications, acceptedUnits, parentDeviceDefinition },
				...repositoryIdVariable,
				connections: props.connections ?? [],
			},
			updater: () => {
				// TODO: For some reason DeviceDefinitionEditor will try to access the newly created
				//  specification but at the same time the name of the specification is not yet
				//  available in the store. This causes a crash in the SpecificationEditor
				//  To prevent this we skip rendering after the mutation is done.
				//  Related (?):
				//  - https://github.com/facebook/relay/issues/2237#issue-282565080 (Initial issue)
				//  - https://github.com/facebook/relay/issues/2237#issuecomment-462839992 (Dev response)
				setSkipRendering(true);
			},
			onCompleted: (d) => props.closeModal(d.repository.addDeviceDefinition.id),
		});
	};

	if (skipRendering) {
		return null;
	}

	return (
		<DeviceDefinitionEditor
			closeModal={props.closeModal}
			onSubmitAdd={addDeviceDefinition}
			isLoading={inFlight}
		/>
	);
}
