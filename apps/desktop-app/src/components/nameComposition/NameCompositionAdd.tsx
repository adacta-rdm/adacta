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

import type { NameCompositionAddCreateMutation } from "@/relay/NameCompositionAddCreateMutation.graphql";

export function NameCompositionAdd(props: PropsWithConnections<{ onClose: () => void }>) {
	const [name, setName] = useState("");
	const [commitInsert] = useMutation<NameCompositionAddCreateMutation>(graphql`
		mutation NameCompositionAddCreateMutation(
			$insert: Insert_NameCompositionInput!
			$connections: [ID!]!
			$repositoryId: ID!
		) {
			repository(id: $repositoryId) {
				upsertNameComposition(insert: $insert) {
					node {
						node @appendNode(connections: $connections, edgeTypeName: "Edge_NameComposition") {
							id
							...NameComposition
							...VariableArrangement
						}
					}
				}
			}
		}
	`);

	const repositoryId = useRepositoryId();

	const onAdd = () =>
		commitInsert({
			variables: {
				repositoryId,
				insert: {
					input: {
						name,
						variables: [],
						legacyNameIndex: 0,
						shortIdIndex: null,
					},
				},
				connections: props.connections,
			},
			onCompleted: props.onClose,
		});

	return (
		<EuiModal onClose={props.onClose}>
			<EuiModalHeader>
				<EuiModalHeaderTitle>Add new name composition</EuiModalHeaderTitle>
			</EuiModalHeader>
			<EuiModalBody>
				<EuiForm>
					<EuiFormRow label={"Name"}>
						<EuiFieldText value={name} onChange={(e) => setName(e.target.value)} />
					</EuiFormRow>
				</EuiForm>
			</EuiModalBody>
			<EuiModalFooter>
				<EuiButton onClick={onAdd}>Add</EuiButton>
			</EuiModalFooter>
		</EuiModal>
	);
}
