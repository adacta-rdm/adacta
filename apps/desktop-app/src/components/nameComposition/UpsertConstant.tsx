import {
	EuiButton,
	EuiFieldText,
	EuiForm,
	EuiFormRow,
	EuiModal,
	EuiModalBody,
	EuiModalFooter,
	EuiModalHeader,
	EuiModalHeaderTitle,
} from "@elastic/eui";
import React, { useState } from "react";
import { graphql, useMutation } from "react-relay";

import type { PropsWithConnections } from "../../interfaces/PropsWithConnections";
import { useRepositoryId } from "../../services/router/UseRepoId";

import type { UpsertConstantInsertMutation } from "@/relay/UpsertConstantInsertMutation.graphql";
import type { UpsertConstantUpdateMutation } from "@/relay/UpsertConstantUpdateMutation.graphql";

export interface IUpdateExistingConstant {
	id: string;
	name: string;
	value: string;
}

export function UpsertConstant(
	props: PropsWithConnections<{
		onClose: () => void;
		existingConstant?: IUpdateExistingConstant;
	}>
) {
	const repositoryId = useRepositoryId();
	const [value, setValue] = useState<string>(props.existingConstant?.value ?? "");
	const [commitAddStatic, pendingAdd] = useMutation<UpsertConstantInsertMutation>(graphql`
		mutation UpsertConstantInsertMutation(
			$repositoryId: ID!
			$insert: Insert_NameCompositionVariableConstantInput
			$connections: [ID!]!
		) {
			repository(id: $repositoryId) {
				upsertNameCompositionVariableConstant(insert: $insert) {
					node
						@prependNode(connections: $connections, edgeTypeName: "Edge_NameCompositionVariable") {
						...BuildingBlock
					}
				}
			}
		}
	`);

	const [commitUpdateStatic, pendingUpdate] = useMutation<UpsertConstantUpdateMutation>(graphql`
		mutation UpsertConstantUpdateMutation(
			$repositoryId: ID!
			$update: Update_NameCompositionVariableConstantInput
			$connections: [ID!]!
		) {
			repository(id: $repositoryId) {
				upsertNameCompositionVariableConstant(update: $update) {
					node
						@prependNode(connections: $connections, edgeTypeName: "Edge_NameCompositionVariable") {
						...BuildingBlock
					}
				}
			}
		}
	`);

	return (
		<EuiModal onClose={props.onClose}>
			<EuiModalHeader>
				<EuiModalHeaderTitle>Add constant</EuiModalHeaderTitle>
			</EuiModalHeader>
			<EuiModalBody>
				<EuiForm>
					<EuiFormRow label={"Value"}>
						<EuiFieldText value={value} onChange={(e) => setValue(e.target.value)} />
					</EuiFormRow>
				</EuiForm>
			</EuiModalBody>
			<EuiModalFooter>
				<EuiButton
					isDisabled={pendingAdd || pendingUpdate}
					isLoading={pendingAdd || pendingUpdate}
					onClick={() => {
						const newConstant = {
							input: {
								name: generateNameFromValue(value),
								value: value,
							},
						};

						if (props.existingConstant) {
							commitUpdateStatic({
								variables: {
									repositoryId,
									connections: props.connections,
									update: { id: props.existingConstant.id, ...newConstant },
								},
								onCompleted: () => props.onClose(),
							});
						} else {
							commitAddStatic({
								variables: {
									repositoryId,
									connections: props.connections,
									insert: newConstant,
								},
								onCompleted: () => props.onClose(),
							});
						}
					}}
				>
					{props.existingConstant ? "Update" : "Add"}
				</EuiButton>
			</EuiModalFooter>
		</EuiModal>
	);
}

/**
 * Initially it was planned to allow the user to enter a name for the constant which is different
 * from the value. This feature is not exposed in the UI as the use case is probably limited to
 * ("Space"/" ") and to make the UI simpler.
 * The backend however requires a name + value for the constant. This function generates a name if
 * the value is " " (Space) and returns the value otherwise.
 */
function generateNameFromValue(value: string): string {
	return value == " " ? "Space" : value;
}
