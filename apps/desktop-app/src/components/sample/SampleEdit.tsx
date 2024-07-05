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
import React, { useRef, useState } from "react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";

import { useRepositoryIdVariable } from "../../services/router/UseRepoId";
import { InheritedSpecificationsSample } from "../device/InheritedSpecifications";
import { UnsavedChangesModal } from "../device/modals/UnsavedChangesModal";
import type { ISpecificationEditorActions } from "../specifications/SpecificationEditor";
import { SpecificationEditorSamples } from "../specifications/SpecificationEditor";

import type { InheritedSpecificationsSample$key } from "@/relay/InheritedSpecificationsSample.graphql";
import type { SampleEditMutation } from "@/relay/SampleEditMutation.graphql";
import type { SampleEditQuery } from "@/relay/SampleEditQuery.graphql";
import type { ISampleId } from "~/lib/database/Ids";
import type { ISpecification } from "~/lib/database/documents/interfaces/ISpecification";

type TSaveSample = (name: string, specifications: ISpecification[]) => void;

export function SampleEdit(props: { closeModal: () => void; sampleId: ISampleId }) {
	const repositoryIdVariable = useRepositoryIdVariable();
	const { repository } = useLazyLoadQuery<SampleEditQuery>(
		graphql`
			query SampleEditQuery($repositoryId: ID!, $sampleId: ID!) {
				repository(id: $repositoryId) {
					sample(id: $sampleId) {
						name
						specifications {
							name
							value
						}
						...InheritedSpecificationsSample
					}
				}
			}
		`,
		{ ...repositoryIdVariable, sampleId: props.sampleId }
	);

	const [commitUpdateSample] = useMutation<SampleEditMutation>(
		graphql`
			mutation SampleEditMutation($input: Update_SampleInput!, $repositoryId: ID!) {
				repository(id: $repositoryId) {
					upsertSample(update: $input) {
						node {
							name
							specifications {
								name
								value
							}
							specificationsCollected {
								level
								sample {
									id
									name
									specifications {
										name
										value
									}
								}
							}
							...InheritedSpecificationsSample
						}
					}
				}
			}
		`
	);

	const saveSample = (name: string, specifications: ISpecification[]) => {
		commitUpdateSample({
			variables: {
				input: { id: props.sampleId, input: { name, specifications } },
				...repositoryIdVariable,
			},
			onCompleted: () => props.closeModal(),
		});
	};

	const { sample } = repository;

	return (
		<SampleEditor
			closeModal={props.closeModal}
			name={sample.name}
			specifications={[...sample.specifications]}
			saveSample={saveSample}
			inheritedSpecifications={repository.sample}
		/>
	);
}

function SampleEditor(props: {
	closeModal: () => void;
	name: string;

	specifications: ISpecification[];
	saveSample: TSaveSample;

	inheritedSpecifications: InheritedSpecificationsSample$key;
}) {
	const [name, setName] = useState(props.name);
	const [specifications, setSpecifications] = useState(props.specifications);
	const [unsavedChanges, setUnsavedChanges] = useState(false);
	const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);

	const specificationEditorRef = useRef<ISpecificationEditorActions | null>(null);

	return (
		<>
			{showUnsavedChangesModal && (
				<UnsavedChangesModal
					onCancel={() => setShowUnsavedChangesModal(false)}
					onConfirm={props.closeModal}
				/>
			)}

			<EuiModal onClose={props.closeModal} style={{ width: "50vw" }}>
				<EuiModalHeader>
					<EuiModalHeaderTitle>Edit Sample</EuiModalHeaderTitle>
				</EuiModalHeader>
				<EuiModalBody>
					<EuiForm>
						<EuiFormRow label={"Sample name"} fullWidth>
							<EuiFieldText value={name} onChange={(e) => setName(e.target.value)} />
						</EuiFormRow>
					</EuiForm>
					<EuiFormRow label={"Specifications"} fullWidth>
						<SpecificationEditorSamples
							ref={specificationEditorRef}
							specifications={specifications}
							setSpecifications={setSpecifications}
							setUnsavedChanges={setUnsavedChanges}
						/>
					</EuiFormRow>
					<InheritedSpecificationsSample
						sample={props.inheritedSpecifications}
						baseSpecifications={specifications}
						onOverwriteInheritedSpecification={(name) => {
							if (!specificationEditorRef.current !== null) {
								specificationEditorRef.current?.addSpecification(name, "");
							}
						}}
					/>
				</EuiModalBody>
				<EuiModalFooter>
					<EuiButton
						fill
						onClick={() => {
							if (!unsavedChanges) {
								props.saveSample(name, specifications);
								props.closeModal();
							} else {
								setShowUnsavedChangesModal(true);
							}
						}}
					>
						Save
					</EuiButton>
				</EuiModalFooter>
			</EuiModal>
		</>
	);
}
