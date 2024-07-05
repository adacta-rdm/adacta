import {
	EuiButton,
	EuiButtonIcon,
	EuiFieldText,
	EuiFlexGroup,
	EuiFlexItem,
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
import {
	useDeviceSpecificationKeys,
	useSampleSpecificationKeys,
} from "../specifications/SpecificationKeyProvider";
import { SearchableSelect } from "../utils/SearchableSelect";

import type { UpsertVariableInsertMutation } from "@/relay/UpsertVariableInsertMutation.graphql";
import type { UpsertVariableUpdateMutation } from "@/relay/UpsertVariableUpdateMutation.graphql";

export interface IUpdateExistingVariable {
	id: string;
	name: string;
	alias: string[];
	prefix?: string;
	suffix?: string;
}

export function UpsertVariable(
	props: PropsWithConnections<{
		onClose: () => void;
		existingVariable?: IUpdateExistingVariable;
	}>
) {
	const repositoryId = useRepositoryId();
	const [name, setName] = useState<string>(props.existingVariable?.name ?? "");
	const [prefix, setPrefix] = useState<string>(props.existingVariable?.prefix ?? "");
	const [suffix, setSuffix] = useState<string>(props.existingVariable?.suffix ?? "");
	const [alias, setAlias] = useState<string[]>(props.existingVariable?.alias ?? []);

	const [commitAddVariable, pendingAdd] = useMutation<UpsertVariableInsertMutation>(graphql`
		mutation UpsertVariableInsertMutation(
			$repositoryId: ID!
			$insert: Insert_NameCompositionVariableVariableInput
			$connections: [ID!]!
		) {
			repository(id: $repositoryId) {
				upsertNameCompositionVariableVariable(insert: $insert) {
					node
						@prependNode(connections: $connections, edgeTypeName: "Edge_NameCompositionVariable") {
						...BuildingBlock
					}
				}
			}
		}
	`);

	const [commitUpdateVariable, pendingUpdate] = useMutation<UpsertVariableUpdateMutation>(graphql`
		mutation UpsertVariableUpdateMutation(
			$repositoryId: ID!
			$update: Update_NameCompositionVariableVariableInput
			$connections: [ID!]!
		) {
			repository(id: $repositoryId) {
				upsertNameCompositionVariableVariable(update: $update) {
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
				<EuiModalHeaderTitle>Add variable</EuiModalHeaderTitle>
			</EuiModalHeader>
			<EuiModalBody>
				<EuiForm>
					<EuiFormRow label={"Name"}>
						<EuiFieldText value={name} onChange={(e) => setName(e.target.value)} />
					</EuiFormRow>
					<EuiFormRow
						label={"Prefix"}
						helpText={"Optionally enter a prefix that will be shown in front of this variable"}
					>
						<EuiFieldText value={prefix} onChange={(e) => setPrefix(e.target.value)} />
					</EuiFormRow>
					<EuiFormRow
						label={"Suffix"}
						helpText={"Optionally enter a suffix that will be shown after the this variable"}
					>
						<EuiFieldText value={suffix} onChange={(e) => setSuffix(e.target.value)} />
					</EuiFormRow>
					<EuiFormRow
						label={"Alias"}
						helpText={"Select the properties that should be used to determine the variables value"}
					>
						<AliasList list={alias} setList={setAlias} />
					</EuiFormRow>
				</EuiForm>
			</EuiModalBody>
			<EuiModalFooter>
				<EuiButton
					isDisabled={pendingAdd || pendingUpdate}
					isLoading={pendingAdd || pendingUpdate}
					onClick={() => {
						const newVariable = { input: { name, alias, prefix, suffix } };

						if (props.existingVariable) {
							commitUpdateVariable({
								variables: {
									repositoryId,
									connections: props.connections,
									update: { id: props.existingVariable.id, ...newVariable },
								},
								onCompleted: () => props.onClose(),
							});
						} else {
							commitAddVariable({
								variables: {
									repositoryId,
									connections: props.connections,
									insert: newVariable,
								},
								onCompleted: () => props.onClose(),
							});
						}
					}}
				>
					{props.existingVariable ? "Update" : "Add"}
				</EuiButton>
			</EuiModalFooter>
		</EuiModal>
	);
}

function AliasList(props: { list: string[]; setList: (value: string[]) => void }) {
	const possibleKeysSample = useSampleSpecificationKeys();
	const possibleKeysDevice = useDeviceSpecificationKeys();
	const keySuggestions = [...possibleKeysDevice, ...possibleKeysSample].filter(
		(k) => !props.list.includes(k)
	);

	const onAddAlias = (alias: string) => {
		if (alias) {
			props.setList([...props.list, alias]);
		}
	};

	return (
		<>
			{props.list.map((l, i) => (
				<EuiFlexGroup key={i}>
					<EuiFlexItem>{l}</EuiFlexItem>
					<EuiFlexItem grow={false}>
						<EuiButtonIcon
							iconType={"cross"}
							onClick={() => props.setList(props.list.filter((p) => p !== l))}
						/>
					</EuiFlexItem>
				</EuiFlexGroup>
			))}
			<EuiFlexGroup justifyContent={"center"}>
				<EuiFlexItem>
					<SearchableSelect
						options={keySuggestions.map((k) => ({
							label: k,
							value: k,
						}))}
						value={undefined}
						onChangeValue={(v) => {
							if (v) {
								onAddAlias(v);
							}
						}}
						onCreateOption={onAddAlias}
					/>
				</EuiFlexItem>
			</EuiFlexGroup>
		</>
	);
}
