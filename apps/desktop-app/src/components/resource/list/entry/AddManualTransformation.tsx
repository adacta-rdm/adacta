import {
	EuiButton,
	EuiFormRow,
	EuiModal,
	EuiModalBody,
	EuiModalHeader,
	EuiModalHeaderTitle,
} from "@elastic/eui";
import { assertDefined, isNonNullish } from "@omegadot/assert";
import React, { useState } from "react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";

import type { PropsWithConnections } from "../../../../interfaces/PropsWithConnections";
import { useRepositoryIdVariable } from "../../../../services/router/UseRepoId";
import { SearchableSuperSelect } from "../../../utils/SearchableSelect";
import { ResourceDropdown } from "../../ResourceDropdown";

import type { AddManualTransformationMutation } from "@/relay/AddManualTransformationMutation.graphql";
import type { AddManualTransformationQuery } from "@/relay/AddManualTransformationQuery.graphql";

export function AddManualTransformation(
	props: PropsWithConnections<{
		onClose: () => void;
		resourceId: string;
		parents: string[];
	}>
) {
	const repositoryIdVariable = useRepositoryIdVariable();
	const data = useLazyLoadQuery<AddManualTransformationQuery>(
		graphql`
			query AddManualTransformationQuery($repositoryId: ID!) {
				repository(id: $repositoryId) {
					resources(rootsOnly: true, first: 1000) {
						# TODO: How to handle this limit (first: 1000) ?
						edges {
							node {
								id
								name
								...ResourceDropdown
							}
						}
					}
				}
			}
		`,
		repositoryIdVariable,
		// Fresh fetch important as root resources could change
		{ fetchPolicy: "network-only" }
	);
	const [resource, setResource] = useState<undefined | string>(undefined);

	const [commitAdd, inFlight] = useMutation<AddManualTransformationMutation>(
		graphql`
			mutation AddManualTransformationMutation(
				$repositoryId: ID!
				$connections: [ID!]!
				$input: AddManualTransformationInput!
			) {
				repository(id: $repositoryId) {
					addManualTransformation(input: $input) {
						source {
							id
							...ResourceListTableFragment
						}
						target {
							id @deleteEdge(connections: $connections)
						}
					}
				}
			}
		`
	);
	const { repositoryId } = repositoryIdVariable;

	const addLink = (source: string, target: string) => {
		commitAdd({
			variables: {
				connections: props.connections,
				repositoryId: repositoryId,
				input: { source, target },
			},
			onCompleted: () => {
				props.onClose();
			},
		});
	};

	const options = data.repository.resources.edges
		.map((e) => e.node)
		.filter(isNonNullish)
		.filter((n) => n.id !== props.resourceId && !props.parents.includes(n.id))
		.map((n) => ({
			label: n.name,
			value: n.id,
			inputDisplay: <ResourceDropdown data={n} />,
		}));

	return (
		<EuiModal maxWidth={"90vw"} onClose={props.onClose} style={{ minWidth: "600px" }}>
			<EuiModalHeader>
				<EuiModalHeaderTitle>Add derived Resource</EuiModalHeaderTitle>
			</EuiModalHeader>
			<EuiModalBody>
				<EuiFormRow
					fullWidth
					label={"Derived resource"}
					helpText={"Select the resource which is the result of the manual transformation"}
				>
					<SearchableSuperSelect
						options={options}
						value={resource}
						onChangeValue={setResource}
						rowHeight={75}
						fullWidth
					/>
				</EuiFormRow>

				<EuiButton
					isDisabled={resource === undefined}
					isLoading={inFlight}
					onClick={() => {
						assertDefined(resource);
						addLink(props.resourceId, resource);
					}}
				>
					Link Resources
				</EuiButton>
			</EuiModalBody>
		</EuiModal>
	);
}
