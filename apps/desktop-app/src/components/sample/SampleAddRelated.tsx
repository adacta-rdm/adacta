import {
	EuiButton,
	EuiButtonEmpty,
	EuiFieldText,
	EuiFormRow,
	EuiModal,
	EuiModalBody,
	EuiModalFooter,
	EuiModalHeader,
	EuiModalHeaderTitle,
	EuiSpacer,
	EuiTab,
	EuiTabs,
} from "@elastic/eui";
import React, { useState } from "react";
import { useMutation } from "react-relay";
import { graphql } from "relay-runtime";

import type { PropsWithConnections } from "../../interfaces/PropsWithConnections";
import { useService } from "../../services/ServiceProvider";
import { useRepositoryIdVariable } from "../../services/router/UseRepoId";
import { ToasterService } from "../../services/toaster/ToasterService";
import { SampleSelection } from "../device/SampleSelection";

import type {
	SampleAddRelated_AddSampleAndSampleRelation_Mutation,
	SampleAddRelated_AddSampleAndSampleRelation_Mutation$variables,
} from "@/relay/SampleAddRelated_AddSampleAndSampleRelation_Mutation.graphql";
import type {
	SampleAddRelated_AddSampleRelation_Mutation,
	SampleAddRelated_AddSampleRelation_Mutation$variables,
} from "@/relay/SampleAddRelated_AddSampleRelation_Mutation.graphql";
import type { ISampleId } from "~/lib/database/Ids";

interface IProps {
	closeModal: () => void;

	relatedToSample: string;
}

export function SampleAddRelated(props: PropsWithConnections<IProps>) {
	const [commitAddSampleAndSampleRelation, addSampleAndSampleRelationInFlight] =
		useMutation<SampleAddRelated_AddSampleAndSampleRelation_Mutation>(
			graphql`
				mutation SampleAddRelated_AddSampleAndSampleRelation_Mutation(
					$input: AddSampleAndSampleRelationInput!
					$repositoryId: ID!
				) {
					repository(id: $repositoryId) {
						addSampleAndSampleRelation(input: $input) {
							...SampleTable_samples
						}
					}
				}
			`
		);

	const [commitAddSampleRelation, addSampleRelationInFlight] =
		useMutation<SampleAddRelated_AddSampleRelation_Mutation>(
			graphql`
				mutation SampleAddRelated_AddSampleRelation_Mutation(
					$input: AddSampleRelationInput!
					$repositoryId: ID!
					$connections: [ID!]!
				) {
					repository(id: $repositoryId) {
						addSampleRelation(input: $input) {
							sample1 {
								id
								...SampleTable_samples
							}
							sample2 {
								# Delete sample2 from top level connection
								# (it will get fetched as "child" of sample1)
								id @deleteEdge(connections: $connections)
							}
						}
					}
				}
			`
		);

	const toaster = useService(ToasterService);

	const [addNew, setAddNew] = useState(true);
	const [sampleId, setSampleId] = useState<string | undefined>(undefined);

	const [sampleName, setSampleName] = useState("");
	const repositoryIdVariable = useRepositoryIdVariable();

	function addSampleAndSampleRelation(
		input: SampleAddRelated_AddSampleAndSampleRelation_Mutation$variables["input"]
	) {
		commitAddSampleAndSampleRelation({
			variables: { input, ...repositoryIdVariable },
			onError: (e) => toaster.addToast("Add sample failed", e.message, "danger"),
			onCompleted: () => props.closeModal(),
		});
	}

	function addSampleRelation(
		input: SampleAddRelated_AddSampleRelation_Mutation$variables["input"]
	) {
		commitAddSampleRelation({
			variables: { input, ...repositoryIdVariable, connections: props.connections },
			onError: (e) => toaster.addToast("Add sample failed", e.message, "danger"),
			onCompleted: () => props.closeModal(),
		});
	}

	const isValid = (addNew && sampleName.trim() !== "") || (!addNew && sampleId !== undefined);

	return (
		<EuiModal onClose={props.closeModal}>
			<EuiModalHeader>
				<EuiModalHeaderTitle>Add derived sample</EuiModalHeaderTitle>
			</EuiModalHeader>

			<EuiModalBody>
				<EuiTabs>
					<EuiTab isSelected={addNew} onClick={() => setAddNew(true)}>
						New Sample
					</EuiTab>
					<EuiTab isSelected={!addNew} onClick={() => setAddNew(false)}>
						Existing Sample
					</EuiTab>
				</EuiTabs>
				<EuiSpacer />

				{addNew ? (
					<EuiFormRow label={"Sample name"}>
						<EuiFieldText
							placeholder="Sample Name"
							value={sampleName}
							onChange={(e) => setSampleName(e.target.value)}
						/>
					</EuiFormRow>
				) : (
					<EuiFormRow label={"Sample name"}>
						<SampleSelection
							valueOfSelected={sampleId}
							fetchPolicy={"network-only"} // Network only to get newly created sample
							onChange={(e) => setSampleId(e)}
							relationsForSample={props.relatedToSample as ISampleId}
						/>
					</EuiFormRow>
				)}
			</EuiModalBody>

			<EuiModalFooter>
				<EuiButtonEmpty
					isLoading={addSampleRelationInFlight || addSampleAndSampleRelationInFlight}
					onClick={props.closeModal}
				>
					Cancel
				</EuiButtonEmpty>
				<EuiButton
					isDisabled={!isValid}
					isLoading={addSampleRelationInFlight || addSampleAndSampleRelationInFlight}
					onClick={() => {
						if (addNew) {
							addSampleAndSampleRelation({
								name: sampleName,
								sample1: props.relatedToSample,
							});
						} else {
							addSampleRelation({
								sample1: props.relatedToSample,

								sample2: sampleId as ISampleId,
							});
						}
					}}
					fill
				>
					Save
				</EuiButton>
			</EuiModalFooter>
		</EuiModal>
	);
}
