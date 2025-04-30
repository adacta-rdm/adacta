import { EuiComboBox, EuiFilePicker, EuiFormRow, EuiPanel } from "@elastic/eui";
import React, { useState } from "react";
import type { GraphQLTaggedNode } from "react-relay";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";

import { useRepoRouterHook } from "../services/router/RepoRouterHook";
import { useRepositoryIdVariable } from "../services/router/UseRepoId";
import { uploadFileBrowser } from "../utils/uploadFileBrowser";

import type { FileUploadMutation } from "@/relay/FileUploadMutation.graphql";
import type { FileUploadProjectsQuery } from "@/relay/FileUploadProjectsQuery.graphql";
import type { FileUploadRequestMutation } from "@/relay/FileUploadRequestMutation.graphql";
import type { IDeviceId } from "~/lib/database/Ids";

const FileUploadGraphQLMutationRequest: GraphQLTaggedNode = graphql`
	mutation FileUploadRequestMutation($repositoryId: ID!) {
		repository(id: $repositoryId) {
			importRawResourceRequest {
				id
				url
			}
		}
	}
`;

const FileUploadGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation FileUploadMutation($input: ImportRawResourceInput!, $repositoryId: ID!) {
		repository(id: $repositoryId) {
			importRawResource(input: $input)
		}
	}
`;

interface IProps {
	deviceId: IDeviceId;

	defaultProjects?: string[];
}

export function FileUpload(props: IProps) {
	const { router, repositoryId } = useRepoRouterHook();
	const repositoryIdVariable = useRepositoryIdVariable();
	const [uploadInFlight, setUploadInFlight] = useState(false);

	const [importRawResourceRequestMutation] = useMutation<FileUploadRequestMutation>(
		FileUploadGraphQLMutationRequest
	);

	const [importRawResourceMutation] = useMutation<FileUploadMutation>(FileUploadGraphQLMutation);
	const [selectedProjects, setSelectedProjects] = useState<string[]>(props.defaultProjects ?? []);

	const importRawResource = (uploadId: string, filename: string) => {
		importRawResourceMutation({
			variables: {
				input: {
					uploadDevice: props.deviceId,
					uploadId: uploadId,
					name: filename,
					projects: selectedProjects,
				},
				...repositoryIdVariable,
			},
			onCompleted: (result) => {
				setUploadInFlight(false);
				router.push("/repositories/:repositoryId/resources/:resourceId", {
					repositoryId,
					resourceId: result.repository.importRawResource,
				});
			},
		});
	};

	const importRawResourceRequest = (file: File) => {
		importRawResourceRequestMutation({
			variables: repositoryIdVariable,
			onCompleted: (result) => {
				const { url, id: uploadId } = result.repository.importRawResourceRequest;

				void uploadFileBrowser(file, url)
					.then(() => importRawResource(uploadId, file.name))
					.catch((e) => {
						throw e;
					});
			},
			onError: (e) => {
				throw e;
			},
		});
	};

	const handleFilePickerChange = (files: FileList | null) => {
		if (!files) return;

		// Handle file removal
		if (files.length === 0) {
			return;
		}
		setUploadInFlight(true);
		importRawResourceRequest(files[0]);
	};

	return (
		<EuiPanel>
			<div style={{ width: 300, position: "relative" }}>
				<EuiFormRow label={"Projects"} helpText={"Project assignment is optional"}>
					<FileUploadProjects
						selectedProjects={selectedProjects}
						setSelectedProjects={setSelectedProjects}
					/>
				</EuiFormRow>
				<EuiFormRow label={"File"}>
					<EuiFilePicker
						isLoading={uploadInFlight}
						initialPromptText="Select or drag and drop csv files (up to 100 MB)"
						onChange={handleFilePickerChange}
						display="large"
					/>
				</EuiFormRow>
			</div>
		</EuiPanel>
	);
}

function FileUploadProjects(props: {
	selectedProjects: string[];
	setSelectedProjects: (selectedProject: string[]) => void;
}) {
	const { selectedProjects, setSelectedProjects } = props;
	const repositoryIdVariable = useRepositoryIdVariable();
	const data = useLazyLoadQuery<FileUploadProjectsQuery>(
		graphql`
			query FileUploadProjectsQuery($repositoryId: ID!) {
				repository(id: $repositoryId) {
					projects {
						edges {
							node {
								id
								name
							}
						}
					}
				}
			}
		`,
		repositoryIdVariable
	);

	const projects = data.repository.projects.edges.map((e) => e.node);
	const options = projects.map((p) => ({ label: `${p.name}`, value: p.id }));
	const selectedOptions = options.filter((o) => selectedProjects.includes(o.value));

	return (
		<EuiComboBox
			aria-label="Assign projects to resource"
			placeholder="Select projects this resource belongs to"
			options={options}
			onChange={(o) => {
				const ids = o.flatMap((id) => {
					if (!id.value) {
						return [];
					}
					return id.value;
				});

				setSelectedProjects(ids);
			}}
			selectedOptions={selectedOptions}
			isClearable={true}
		/>
	);
}
