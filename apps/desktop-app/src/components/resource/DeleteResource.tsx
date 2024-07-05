import React from "react";
import { graphql, useMutation } from "react-relay";

import type { PropsWithConnections } from "../../interfaces/PropsWithConnections";
import { useRepositoryId } from "../../services/router/UseRepoId";
import type { IDeleteButtonConfig } from "../utils/DeleteWithConfirmation";
import { DeleteWithConfirmation } from "../utils/DeleteWithConfirmation";

import type { DeleteResource_DeleteResource_Mutation } from "@/relay/DeleteResource_DeleteResource_Mutation.graphql";
import type { IResourceId } from "~/lib/database/Ids";

interface IProps {
	resourceId: IResourceId | string;

	disabled?: boolean;

	/**
	 * Callback which gets called after the resource was deleted.
	 * Allows further actions related to a successful deletion (i.e. redirect depending on context)
	 */
	onResourceDeleted?: () => void;
}

export function DeleteResource(props: PropsWithConnections<IProps & IDeleteButtonConfig>) {
	const [commitDeleteResource, deleteResourceInFlight] =
		useMutation<DeleteResource_DeleteResource_Mutation>(graphql`
			mutation DeleteResource_DeleteResource_Mutation(
				$repositoryId: ID!
				$connections: [ID!]!
				$input: DeleteResourceInput!
			) {
				repository(id: $repositoryId) {
					deleteResource(input: $input) {
						deletedId @deleteEdge(connections: $connections)
					}
				}
			}
		`);

	const repositoryId = useRepositoryId();

	const onClick = () => {
		commitDeleteResource({
			variables: {
				repositoryId,
				connections: props.connections,
				input: { resourceId: props.resourceId },
			},
			updater: (c) => {
				c.get(props.resourceId)?.invalidateRecord();
			},
			onCompleted: () => {
				if (props.onResourceDeleted) {
					props.onResourceDeleted();
				}
			},
		});
	};

	return (
		<DeleteWithConfirmation
			onClick={onClick}
			isLoading={deleteResourceInFlight}
			disableReason={
				props.disabled ? "You can not delete this Resource as it still has children" : undefined
			}
			buttonColor={props.buttonColor}
			buttonStyle={props.buttonStyle}
			confirmationText={<>Are you sure you want to delete this Resource?</>}
			size={props.size}
		/>
	);
}
