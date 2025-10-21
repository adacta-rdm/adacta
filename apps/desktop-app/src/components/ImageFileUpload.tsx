import { EuiFilePicker } from "@elastic/eui";
import React, { useRef, useState } from "react";
import type { GraphQLTaggedNode } from "react-relay";
import { graphql } from "react-relay";

import { useRepositoryIdVariable } from "../services/router/UseRepoId";

import type { ImageFileUploadMutation } from "@/relay/ImageFileUploadMutation.graphql";
import type { ImageFileUploadRequestMutation } from "@/relay/ImageFileUploadRequestMutation.graphql";
import { uploadFile } from "~/apps/desktop-app/src/utils/uploadFile";
import { useMutationErrorHandler } from "~/apps/desktop-app/src/utils/useMutationErrorHandler";
import { useMutationPromise } from "~/apps/desktop-app/src/utils/useMutationPromise";
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
			importImageResource(input: $input) {
				error {
					message
				}
				data {
					id
				}
			}
		}
	}
`;

interface IProps {
	/**
	 * If true, the file picker will not be cleared after a file is uploaded
	 */
	disableAutoClear?: boolean;
	callback: (resourceId: IResourceId) => void | Promise<void>;
}

export function ImageFileUpload(props: IProps) {
	const [uploading, setUploading] = useState(false);

	const filePickerRef = useRef<EuiFilePicker>(null);

	const repositoryIdVariable = useRepositoryIdVariable();

	const [importImageResourceRequestMutation] = useMutationPromise<ImageFileUploadRequestMutation>(
		ImageFileUploadGraphQLMutationRequest
	);

	const [importImageResourceMutation] = useMutationPromise<ImageFileUploadMutation>(
		ImageFileUploadGraphQLMutation
	);

	const [errorHandler, ErrorCallout] = useMutationErrorHandler({
		autoCallout: true,
	});

	const importFile = async (file: File) => {
		setUploading(true);

		// Request upload URL + Upload ID
		const uploadRequestResponse = (
			await importImageResourceRequestMutation({
				variables: repositoryIdVariable,
			})
		).repository.importRawResourceRequest;

		// Upload the actual file
		await uploadFile(file, uploadRequestResponse.url);

		if (filePickerRef.current && !props.disableAutoClear) {
			filePickerRef.current.removeFiles();
		}

		// Import the uploaded file as a (Image-)Resource
		const uploadResponse = errorHandler(
			(
				await importImageResourceMutation({
					variables: {
						input: { uploadId: uploadRequestResponse.id },
						...repositoryIdVariable,
					},
				})
			).repository.importImageResource
		);

		if (uploadResponse !== null) {
			await props.callback(uploadResponse.id as IResourceId);
			setUploading(false);
		}
	};

	const handleFilePickerChange = (files: FileList | null) => {
		if (!files) return;

		// Handle file removal
		if (files.length === 0) {
			return;
		}
		setUploading(true);
		importFile(files[0]).finally(() => setUploading(false));
	};

	return (
		<>
			<ErrorCallout />
			<div style={{ width: 300, position: "relative" }}>
				<EuiFilePicker
					isLoading={uploading}
					ref={filePickerRef}
					initialPromptText="Select or drag and drop an image file"
					onChange={handleFilePickerChange}
					display="large"
				/>
			</div>
		</>
	);
}
