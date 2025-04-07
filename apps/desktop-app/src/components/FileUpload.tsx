import { EuiFilePicker, EuiFormRow, EuiPanel } from "@elastic/eui";
import React, { useState } from "react";
import type { GraphQLTaggedNode } from "react-relay";
import { graphql, useMutation } from "react-relay";

import { useRepoRouterHook } from "../services/router/RepoRouterHook";
import { useRepositoryIdVariable } from "../services/router/UseRepoId";

import type { FileUploadMutation } from "@/relay/FileUploadMutation.graphql";
import type { FileUploadRequestMutation } from "@/relay/FileUploadRequestMutation.graphql";
import { uploadFile } from "~/apps/desktop-app/src/utils/uploadFile";
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
}

export function FileUpload(props: IProps) {
	const { router, repositoryId } = useRepoRouterHook();
	const repositoryIdVariable = useRepositoryIdVariable();
	const [uploadInFlight, setUploadInFlight] = useState(false);

	const [importRawResourceRequestMutation] = useMutation<FileUploadRequestMutation>(
		FileUploadGraphQLMutationRequest
	);

	const [importRawResourceMutation] = useMutation<FileUploadMutation>(FileUploadGraphQLMutation);

	const importRawResource = (uploadId: string, filename: string) => {
		importRawResourceMutation({
			variables: {
				input: { uploadDevice: props.deviceId, uploadId: uploadId, name: filename },
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

				void uploadFile(file, url)
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
