import {
	EuiButton,
	EuiButtonEmpty,
	EuiForm,
	EuiFormRow,
	EuiModal,
	EuiModalBody,
	EuiModalFooter,
	EuiModalHeader,
	EuiModalHeaderTitle,
} from "@elastic/eui";
import React, { useState } from "react";
import type { GraphQLTaggedNode } from "react-relay";
import { useMutation } from "react-relay";
import { graphql } from "relay-runtime";

import { useService } from "../../services/ServiceProvider";
import { useRepositoryIdVariable } from "../../services/router/UseRepoId";
import { ToasterService } from "../../services/toaster/ToasterService";
import { UniqueName } from "../UniqueName";

import type {
	SampleAddMutation,
	SampleAddMutation$variables,
} from "@/relay/SampleAddMutation.graphql";

interface IProps {
	closeModal: () => void;
	connectionId: string;
}

const SampleAddAppendGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation SampleAddMutation($connections: [ID!]!, $input: AddSampleInput!, $repositoryId: ID!) {
		repository(id: $repositoryId) {
			addSample(input: $input) {
				appendedEdge @appendEdge(connections: $connections) {
					node {
						...SampleTable_samples
					}
				}
			}
		}
	}
`;

export function SampleAdd(props: IProps) {
	const [commitAddSample, addSampleInFlight] = useMutation<SampleAddMutation>(
		SampleAddAppendGraphQLMutation
	);
	const toaster = useService(ToasterService);

	const [errors, setErrors] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const [sampleName, setSampleName] = useState("");
	const repositoryIdVariable = useRepositoryIdVariable();

	function addSample(input: SampleAddMutation$variables["input"]) {
		commitAddSample({
			variables: { input, connections: [props.connectionId], ...repositoryIdVariable },
			onError: (e) => toaster.addToast("Add sample failed", e.message, "danger"),
			onCompleted: () => props.closeModal(),
		});
	}

	return (
		<EuiModal onClose={props.closeModal}>
			<EuiModalHeader>
				<EuiModalHeaderTitle>Add sample</EuiModalHeaderTitle>
			</EuiModalHeader>

			<EuiModalBody>
				<EuiForm error={errors} isInvalid={!!errors.length}>
					<EuiFormRow label={"Sample name"}>
						<UniqueName
							isLoading={addSampleInFlight}
							placeholder="Sample Name"
							value={sampleName}
							onChange={(e) => setSampleName(e.target.value)}
							uniqueName={{
								checkFor: "SAMPLE",
								setErrors,
								formState: { isLoading, setIsLoading },
							}}
						/>
					</EuiFormRow>
				</EuiForm>
			</EuiModalBody>

			<EuiModalFooter>
				<EuiButtonEmpty isLoading={addSampleInFlight} onClick={props.closeModal}>
					Cancel
				</EuiButtonEmpty>
				<EuiButton
					isLoading={addSampleInFlight || isLoading}
					onClick={() => {
						if (errors.length > 0 || isLoading) {
							return;
						}

						addSample({ name: sampleName });
					}}
					fill
				>
					Save
				</EuiButton>
			</EuiModalFooter>
		</EuiModal>
	);
}
