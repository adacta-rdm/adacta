import {
	EuiButton,
	EuiCallOut,
	EuiComboBox,
	EuiFieldText,
	EuiFlexGroup,
	EuiFlexItem,
	EuiFormRow,
	EuiModal,
	EuiModalBody,
	EuiModalFooter,
	EuiModalHeader,
	EuiModalHeaderTitle,
	EuiSpacer,
	EuiSuperSelect,
	EuiSwitch,
} from "@elastic/eui";
import React, { useState } from "react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";

import type { DataverseExportModalDataversesQuery } from "@/relay/DataverseExportModalDataversesQuery.graphql";
import type { DataverseExportModalMutation } from "@/relay/DataverseExportModalMutation.graphql";
import type { DataverseExportModalSearchMutation } from "@/relay/DataverseExportModalSearchMutation.graphql";
import type { DataverseExportModalSelectionQuery } from "@/relay/DataverseExportModalSelectionQuery.graphql";
import {
	SearchableSelectLoading,
	SearchableSuperSelect,
} from "~/apps/desktop-app/src/components/utils/SearchableSelect";
import { useDebounceFormUpdate } from "~/apps/desktop-app/src/components/utils/useDebouncedFormUpdate";
import { useRepositoryId } from "~/apps/desktop-app/src/services/router/UseRepoId";
import { connectionToArray } from "~/apps/desktop-app/src/utils/connectionToArray";
import { wrapWithSuspense } from "~/apps/desktop-app/src/utils/wrapWithSuspense";
import { assertDefined } from "~/lib/assert";

export function DataverseExportModal(props: { resourceId: string; onClose: () => void }) {
	return <DataverseExportModalCore resourceId={props.resourceId} onClose={props.onClose} />;
}

function DataverseExportModalCore(props: {
	resourceId: string;
	onClose: () => void;
	initialValues?: {
		dataverseHost: string;
		dataverseToken: string;
		dataverse: string;
	};
}) {
	const [dataverseInstanceId, setDataverseInstanceId] = useState<string | undefined>(undefined);

	const [dataverse, setDataverse] = useState(props.initialValues?.dataverse ?? "");
	const [dataverseFetchKey, setDataverseFetchKey] = useState<number | undefined>(undefined);

	const [useExistingDataSet, setUseExistingDataSet] = useState(false);

	// Data to create Dataset
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [subject, setSubject] = useState("");

	// Existing dataset ID
	const [existingDatasetId, setExistingDatasetId] = useState("");

	// Response to publication request
	const [publicationResponse, setPublicationResponse] = useState("");

	const repositoryId = useRepositoryId();

	const dataverses = useLazyLoadQuery<DataverseExportModalDataversesQuery>(
		graphql`
			query DataverseExportModalDataversesQuery {
				currentUser {
					payload {
						dataverses {
							# Used by connectionToArray
							# eslint-disable-next-line relay/unused-fields
							edges {
								node {
									id
									name
									url
								}
							}
						}
					}
				}
			}
		`,
		{}
	);

	const [publishMutation, inFlight] = useMutation<DataverseExportModalMutation>(graphql`
		mutation DataverseExportModalMutation($input: PublishToDataverseInput!, $repositoryId: ID!) {
			repository(id: $repositoryId) {
				publishToDataverse(input: $input)
			}
		}
	`);

	return (
		<EuiModal onClose={props.onClose}>
			<EuiModalHeader>
				<EuiModalHeaderTitle>Export to dataverse</EuiModalHeaderTitle>
			</EuiModalHeader>
			<EuiModalBody>
				{publicationResponse && (
					<>
						<EuiCallOut color={"success"} title={"Export successful!"}>
							<p>Your data has been successfully exported to Dataverse.</p>
							<a href={publicationResponse} target={"_blank"} rel="noreferrer">
								View on Dataverse
							</a>
						</EuiCallOut>
						<EuiSpacer />
					</>
				)}
				<EuiFormRow label={"Dataverse Instance"}>
					<SearchableSuperSelect
						value={dataverseInstanceId}
						options={connectionToArray(dataverses.currentUser.payload.dataverses).map((t) => {
							return {
								label: t.name,
								value: t.id,
								inputDisplay: `${t.name} (${new URL(t.url).hostname})`,
							};
						})}
						onChangeValue={(v) => {
							// Set instance
							setDataverseInstanceId(v);

							// Reset dataverse
							setDataverse("");
							setExistingDatasetId("");

							setPublicationResponse("");

							// Refetch "Dataverse"
							setDataverseFetchKey((v) => {
								return (v ?? 0) + 1;
							});
						}}
					/>
				</EuiFormRow>

				{dataverseInstanceId && (
					<>
						{" "}
						<EuiFormRow label={"Dataverse"}>
							<EuiFlexGroup direction={"row"}>
								<EuiFlexItem>
									{dataverseInstanceId && dataverseFetchKey !== undefined ? (
										<DataverseSelection
											fetchKey={dataverseFetchKey}
											instanceId={dataverseInstanceId}
											value={dataverse ?? undefined}
											onChange={(v) => setDataverse(v ?? "")}
										/>
									) : (
										<EuiSuperSelect
											options={[]}
											valueOfSelected={dataverse}
											onChange={setDataverse}
											disabled={true}
										/>
									)}
								</EuiFlexItem>
								<EuiFlexItem grow={false}>
									<EuiButton
										onClick={() =>
											setDataverseFetchKey((v) => {
												return (v ?? 0) + 1;
											})
										}
									>
										Refresh Dataverse options
									</EuiButton>
								</EuiFlexItem>
							</EuiFlexGroup>
						</EuiFormRow>
						{dataverse && (
							<>
								<EuiSpacer />
								<EuiFormRow>
									<EuiSwitch
										label={"Use existing dataset?"}
										checked={useExistingDataSet}
										onChange={(e) => setUseExistingDataSet(e.target.checked)}
									/>
								</EuiFormRow>
								{useExistingDataSet ? (
									<EuiFormRow
										label={"Search"}
										helpText={"Enter the name of the existing dataset to search for it.."}
									>
										<DataverseSearch
											dataverse={dataverse}
											instanceId={dataverseInstanceId}
											onSelect={(v) => setExistingDatasetId(v)}
										/>
									</EuiFormRow>
								) : (
									<>
										<EuiFormRow label={"Title"}>
											<EuiFieldText onChange={(e) => setTitle(e.target.value)} value={title} />
										</EuiFormRow>
										<EuiFormRow label={"Description"}>
											<EuiFieldText
												onChange={(e) => setDescription(e.target.value)}
												value={description}
											/>
										</EuiFormRow>
										<EuiFormRow label={"Subject"}>
											<EuiFieldText onChange={(e) => setSubject(e.target.value)} value={subject} />
										</EuiFormRow>
									</>
								)}
							</>
						)}
					</>
				)}
			</EuiModalBody>
			<EuiModalFooter>
				<EuiButton
					fill
					disabled={inFlight || !dataverseInstanceId || !dataverse}
					isLoading={inFlight}
					onClick={() => {
						assertDefined(dataverseInstanceId);
						const targetDataset = useExistingDataSet
							? {
									useExistingDataset: existingDatasetId,
							  }
							: {
									createNewDataset: {
										title,
										description,
										subject: subject.split(","),
									},
							  };

						publishMutation({
							onCompleted: (response) => {
								setPublicationResponse(response.repository?.publishToDataverse ?? "");
							},
							variables: {
								repositoryId,
								input: {
									dataverse,
									dataverseInstanceId,
									...targetDataset,
									resourceId: props.resourceId,
								},
							},
						});
					}}
				>
					Export
				</EuiButton>
			</EuiModalFooter>
		</EuiModal>
	);
}

export const DataverseSelection = wrapWithSuspense(
	({
		instanceId,
		value,
		onChange,
		fetchKey,
	}: {
		instanceId: string;
		value?: string;
		onChange: (value: undefined | string) => void;
		fetchKey: number;
	}) => {
		const repositoryId = useRepositoryId();
		const data = useLazyLoadQuery<DataverseExportModalSelectionQuery>(
			graphql`
				query DataverseExportModalSelectionQuery($repositoryId: ID!, $instanceId: ID!) {
					repository(id: $repositoryId) {
						dataverses(instanceId: $instanceId) {
							id
							title
						}
					}
				}
			`,
			{ instanceId, repositoryId },
			{ fetchKey: `${fetchKey}${instanceId}${repositoryId}` }
		);

		return (
			<SearchableSuperSelect
				options={data.repository.dataverses.map((dataverse) => ({
					label: dataverse.title,
					value: dataverse.id,
					inputDisplay: dataverse.title,
				}))}
				value={value}
				onChangeValue={onChange}
			/>
		);
	},
	() => <SearchableSelectLoading />
);

function DataverseSearch(props: {
	instanceId: string;
	dataverse: string;

	onSelect: (id: string) => void;
}) {
	const [results, setResults] = useState<
		readonly { readonly id: string; readonly title: string }[]
	>([]);
	const [loading, setLoading] = useState(false);

	const [selectedOptions, setSelectedOptions] = useState<
		{ value?: string; label: string } | undefined
	>(undefined);

	const repositoryId = useRepositoryId();
	const [fetch] = useMutation<DataverseExportModalSearchMutation>(graphql`
		mutation DataverseExportModalSearchMutation($repositoryId: ID!, $input: SearchDataverseInput!) {
			repository(id: $repositoryId) {
				searchDataverse(input: $input) {
					id
					title
				}
			}
		}
	`);

	const [, setQuery] = useDebounceFormUpdate<string>(
		"",
		(v) => {
			fetch({
				variables: {
					repositoryId,
					input: {
						dataverseInstanceId: props.instanceId,
						dataverse: props.dataverse,
						query: v,
					},
				},
				onCompleted: (response) => {
					setResults(response.repository?.searchDataverse ?? []);
					setLoading(false);
				},
			});
		},
		1500
	);

	return (
		<>
			<EuiComboBox
				placeholder="Search existing datasets"
				async
				singleSelection={{ asPlainText: true }}
				options={results.map((r) => ({ label: r.title, value: r.id }))}
				selectedOptions={selectedOptions ? [selectedOptions] : undefined}
				isLoading={loading}
				onChange={(v) => {
					if (v[0] !== undefined) {
						setSelectedOptions(v[0]);
						props.onSelect(v[0].value ?? "");
					}
				}}
				onSearchChange={(v) => {
					if (!v) {
						return;
					}
					setLoading(true);
					setQuery(v);
				}}
			/>
		</>
	);
}
