import { EuiFilePicker } from "@elastic/eui";
import { assertDefined } from "@omegadot/assert";
import React, { useRef } from "react";
import type { GraphQLTaggedNode } from "react-relay";
import { graphql, useMutation } from "react-relay";

import { useRepositoryIdVariable } from "../services/router/UseRepoId";
import { uploadFileBrowser } from "../utils/uploadFileBrowser";

import type { ImageFileUploadMutation } from "@/relay/ImageFileUploadMutation.graphql";
import type { ImageFileUploadRequestMutation } from "@/relay/ImageFileUploadRequestMutation.graphql";
import type { IResourceId } from "~/lib/database/Ids";

const ImageFileUploadGraphQLMutationRequest: GraphQLTaggedNode = graphql`
	mutation ImageFileUploadRequestMutation($repositoryId: ID!) {
		repository(id: $repositoryId) {
			importRawResourceRequest {
				id
				url
			}
		}
	}
`;

const ImageFileUploadGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation ImageFileUploadMutation($input: ImportImageResourceInput!, $repositoryId: ID!) {
		repository(id: $repositoryId) {
			importImageResource(input: $input)
		}
	}
`;

interface IProps {
	callback: (resourceId: IResourceId) => void;
}

export function ImageFileUpload(props: IProps) {
	const filePickerRef = useRef<EuiFilePicker>(null);

	const repositoryIdVariable = useRepositoryIdVariable();

	const [importImageResourceRequestMutation] = useMutation<ImageFileUploadRequestMutation>(
		ImageFileUploadGraphQLMutationRequest
	);

	const [importImageResourceMutation] = useMutation<ImageFileUploadMutation>(
		ImageFileUploadGraphQLMutation
	);

	const importImageResource = (uploadId: string) => {
		importImageResourceMutation({
			variables: {
				input: { uploadId: uploadId },
				...repositoryIdVariable,
			},
			onCompleted: (result) => {
				assertDefined(result);

				props.callback(result.repository.importImageResource as IResourceId);
			},
		});
	};

	const importImageResourceRequest = (file: File) => {
		importImageResourceRequestMutation({
			variables: repositoryIdVariable,
			onCompleted: (result) => {
				const { url, id: uploadId } = result.repository.importRawResourceRequest;

				void uploadFileBrowser(file, url)
					.then(() => {
						if (filePickerRef.current) {
							filePickerRef.current.removeFiles();
						}
						importImageResource(uploadId);
					})
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
		importImageResourceRequest(files[0]);
	};

	return (
		<>
			<div style={{ width: 300, position: "relative" }}>
				<EuiFilePicker
					ref={filePickerRef}
					initialPromptText="Select or drag and drop an image file"
					onChange={handleFilePickerChange}
					display="large"
				/>
			</div>
		</>
	);
}
