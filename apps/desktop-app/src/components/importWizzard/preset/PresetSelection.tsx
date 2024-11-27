import assert from "assert";

import {
	EuiButtonEmpty,
	EuiButtonIcon,
	EuiFieldText,
	EuiForm,
	EuiPopover,
	EuiSelect,
} from "@elastic/eui";
import React, { useState } from "react";
import type { GraphQLTaggedNode } from "react-relay";
import {
	graphql,
	useMutation,
	usePaginationFragment,
	useRelayEnvironment,
	useSubscribeToInvalidationState,
} from "react-relay";

import { PresetManager } from "./PresetManager";
import { useRepositoryIdVariable } from "../../../services/router/UseRepoId";
import { fetchQueryWrapper } from "../../../utils/fetchQueryWrapper";

import type { PresetSelection$key } from "@/relay/PresetSelection.graphql";
import type { PresetSelectionFetchPresetQuery } from "@/relay/PresetSelectionFetchPresetQuery.graphql";
import type { PresetSelectionSavePresetMutation } from "@/relay/PresetSelectionSavePresetMutation.graphql";
import { IImportTransformationType } from "~/apps/repo-server/src/graphql/generated/resolvers";
import { assertDefined } from "~/lib/assert/assertDefined";
import type { IDeviceId } from "~/lib/database/Ids";
import type { ICSVPreset, IGamryPreset } from "~/lib/interface/IImportWizardPreset";

const PresetSelectionGraphQLFragment = graphql`
	fragment PresetSelection on RepositoryQuery
	@refetchable(queryName: "PresetSelectionFragment")
	@argumentDefinitions(
		first: { type: "Int" }
		after: { type: "String" }
		deviceId: { type: "ID" }
		type: { type: "ImportTransformationType" }
	) {
		importPresets(after: $after, first: $first, deviceId: $deviceId, type: $type)
			@connection(key: "ImportWizardQuery_importPresets") {
			__id
			edges {
				node {
					id
					displayName
				}
			}
		}
	}
`;

const SaveImportPresetGraphqlMutation: GraphQLTaggedNode = graphql`
	mutation PresetSelectionSavePresetMutation(
		$connections: [ID!]!
		$insert: Insert_ImportPresetInput!
		$repositoryId: ID!
	) {
		repository(id: $repositoryId) {
			upsertImportPreset(insert: $insert) {
				node @appendNode(connections: $connections, edgeTypeName: "ImportPreset") {
					id
					displayName
				}
			}
		}
	}
`;

interface ITypeToPreset {
	csv: ICSVPreset;
	gamry: IGamryPreset;
}

interface IProps<T extends "csv" | "gamry"> {
	type: T;
	currentPreset?: ITypeToPreset[T];
	deviceId: IDeviceId;
	presets: PresetSelection$key;
	loadPreset: (preset: ITypeToPreset[T]) => void;
}

export function PresetSelection<T extends "csv" | "gamry">(props: IProps<T>) {
	const environment = useRelayEnvironment();
	const repositoryIdVariable = useRepositoryIdVariable();
	const { data, refetch } = usePaginationFragment(PresetSelectionGraphQLFragment, props.presets);
	const [presetId, setPresetId] = useState<string | undefined>(undefined);
	const [savePresetMutation] = useMutation<PresetSelectionSavePresetMutation>(
		SaveImportPresetGraphqlMutation
	);

	const [showPresetPopover, setShowPresetPopover] = useState(false);
	const [presetName, setPresetName] = useState("");
	const [showPresetEditor, setShowPresetEditor] = useState(false);

	// Re-fetch query to update list if PresetManager invalidated the connection
	useSubscribeToInvalidationState([data.importPresets.__id], () => {
		refetch({});
	});

	const savePreset = () => {
		savePresetMutation({
			variables: {
				insert: {
					input: {
						presetType:
							props.type === "csv"
								? IImportTransformationType.Csv
								: IImportTransformationType.Gamry,
						presetJson: JSON.stringify(props.currentPreset),
						name: presetName,
						deviceId: [props.deviceId],
					},
				},
				...repositoryIdVariable,
				connections: [data.importPresets.__id],
			},
		});
		setShowPresetPopover(false);
	};

	const loadPreset = async () => {
		if (!presetId) {
			return;
		}

		const presetResponse = await fetchQueryWrapper<PresetSelectionFetchPresetQuery>(
			environment,
			graphql`
				query PresetSelectionFetchPresetQuery($repositoryId: ID!, $id: ID!) {
					repository(id: $repositoryId) {
						node(id: $id) {
							... on ImportPreset {
								__typename
								type
								presetJSON
							}
						}
					}
				}
			`,
			{ ...repositoryIdVariable, id: presetId }
		);

		const node = presetResponse.repository.node;
		assertDefined(node);
		assert(node.__typename !== "%other");

		if (node.type === IImportTransformationType.Csv) {
			assert(props.type === "csv");
		}

		if (node.type === IImportTransformationType.Gamry) {
			assert(props.type === "gamry");
		}

		const preset = JSON.parse(node.presetJSON) as ITypeToPreset[T];
		props.loadPreset(preset);
	};

	const options = data.importPresets.edges.flatMap((e) => {
		if (e.node === null || e.node?.displayName === null) {
			//return { value: e.node?.id, text: "TEMP" }; // TODO: Remove
			return [];
		}

		return {
			value: e.node.id,
			text: e.node?.displayName,
		};
	});
	options.unshift({ value: "", text: "Select preset" });

	return (
		<>
			{showPresetEditor && (
				<PresetManager
					type={props.type}
					onClose={() => setShowPresetEditor(false)}
					openerPresetConnectionId={data.importPresets.__id}
				/>
			)}
			<EuiSelect
				options={options}
				onChange={(e) => setPresetId(e.target.value)}
				value={presetId}
				style={{ width: "250px" }}
				append={
					<>
						<EuiButtonIcon
							aria-label="load preset"
							iconType="download"
							onClick={() => void loadPreset()}
							disabled={presetId === undefined || presetId === ""}
						/>
						<EuiPopover
							button={
								<EuiButtonIcon
									aria-label="Save"
									iconType="save"
									onClick={() => setShowPresetPopover(!showPresetPopover)}
								/>
							}
							isOpen={showPresetPopover}
							closePopover={() => setShowPresetPopover(false)}
						>
							<EuiForm>
								<EuiFieldText
									value={presetName}
									onChange={(e) => setPresetName(e.target.value)}
									append={
										<EuiButtonEmpty
											size="xs"
											onClick={savePreset}
											disabled={props.currentPreset === undefined}
										>
											Save
										</EuiButtonEmpty>
									}
								/>
							</EuiForm>
						</EuiPopover>
						<EuiButtonIcon
							aria-label="edit preset"
							iconType="indexEdit"
							onClick={() => setShowPresetEditor(true)}
						/>
					</>
				}
			/>
		</>
	);
}
