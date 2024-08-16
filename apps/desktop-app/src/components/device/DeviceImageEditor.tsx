import type { EuiBasicTableColumn } from "@elastic/eui";
import {
	EuiBadge,
	EuiBasicTable,
	EuiButton,
	EuiModal,
	EuiModalBody,
	EuiModalFooter,
	EuiModalHeader,
	EuiModalHeaderTitle,
	EuiSpacer,
	EuiText,
	EuiTitle,
} from "@elastic/eui";
import { isNonNullish } from "@omegadot/assert";
import React from "react";
import type { GraphQLTaggedNode } from "react-relay";
import { graphql, useMutation } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { useRepositoryIdVariable } from "../../services/router/UseRepoId";
import { ImageFileUpload } from "../ImageFileUpload";

import type { DeviceImageEditor$key } from "@/relay/DeviceImageEditor.graphql";
import type { DeviceImageEditorAddMutation } from "@/relay/DeviceImageEditorAddMutation.graphql";
import type { DeviceImageEditorDeleteMutation } from "@/relay/DeviceImageEditorDeleteMutation.graphql";
import type { DeviceImageEditorMakePrimaryMutation } from "@/relay/DeviceImageEditorMakePrimaryMutation.graphql";
import { AdactaImage } from "~/apps/desktop-app/src/components/image/AdactaImage";
import type { ArrayElementType } from "~/lib/interface/ArrayElementType";

const DeviceImageEditorGraphQLFragment = graphql`
	fragment DeviceImageEditor on HasImageResource {
		__typename
		id
		imageResource {
			id
			...AdactaImageFragment @arguments(preset: THUMBNAIL)
		}
	}
`;

const DeviceImageEditorMakePrimaryGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation DeviceImageEditorMakePrimaryMutation(
		$repositoryId: ID!
		$input: MakePrimaryDeviceImageInput!
	) {
		repository(id: $repositoryId) {
			makePrimaryDeviceImage(input: $input) {
				...DeviceImageEditor
			}
		}
	}
`;

const DeviceImageEditorAddGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation DeviceImageEditorAddMutation($repositoryId: ID!, $input: AddDeviceImageInput!) {
		repository(id: $repositoryId) {
			addDeviceImage(input: $input) {
				...DeviceImageEditor
			}
		}
	}
`;

const DeviceImageEditorDeleteGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation DeviceImageEditorDeleteMutation($repositoryId: ID!, $input: DeleteDeviceImageInput!) {
		repository(id: $repositoryId) {
			deleteDeviceImage(input: $input) {
				...DeviceImageEditor
			}
		}
	}
`;

interface IProps {
	deviceOrDeviceDefinition: DeviceImageEditor$key;
	closeModal: () => void;
}

/**
 * Image Editor Component for Devices or DeviceDefinitions
 */
export function DeviceImageEditor({ deviceOrDeviceDefinition, closeModal }: IProps) {
	const data = useFragment(DeviceImageEditorGraphQLFragment, deviceOrDeviceDefinition);
	const images = data.imageResource;

	const [makePrimaryMutation] = useMutation<DeviceImageEditorMakePrimaryMutation>(
		DeviceImageEditorMakePrimaryGraphQLMutation
	);
	const [addImageMutation] = useMutation<DeviceImageEditorAddMutation>(
		DeviceImageEditorAddGraphQLMutation
	);
	const [deleteImageMutation] = useMutation<DeviceImageEditorDeleteMutation>(
		DeviceImageEditorDeleteGraphQLMutation
	);

	const repositoryIdVariable = useRepositoryIdVariable();

	const makePrimary = (imageId: string) => {
		makePrimaryMutation({
			variables: { input: { imageOwnerId: data.id, imageId }, ...repositoryIdVariable },
			onError: (e) => {
				throw e;
			},
		});
	};

	const addImage = async (imageId: string) => {
		await new Promise((resolve) => {
			addImageMutation({
				variables: { input: { imageOwnerId: data.id, imageId }, ...repositoryIdVariable },
				onError: (e) => {
					throw e;
				},
				onCompleted: resolve,
			});
		});
	};

	const deleteImage = (imageId: string) => {
		deleteImageMutation({
			variables: { input: { imageOwnerId: data.id, imageId }, ...repositoryIdVariable },
			onError: (e) => {
				throw e;
			},
		});
	};

	const columns: EuiBasicTableColumn<ArrayElementType<typeof images> & { index: number }>[] = [
		{
			field: "image",
			name: "Image",
			render: function ImageColumn(_, item) {
				return <AdactaImage alt={`picture #${item.index}`} image={item} />;
			},
		},
		{
			field: "status",
			name: "",
			render: function BadgeColumn(_, item) {
				return item.index === 0 ? <EuiBadge color="primary">Primary Image</EuiBadge> : <></>;
			},
		},
		{
			name: "Actions",
			actions: [
				{
					name: "Remove",
					onClick: (item) => {
						deleteImage(item.id);
					},
					description: "Removes image from this device",
				},
				{
					name: "Make primary",
					onClick: (item) => {
						makePrimary(item.id);
					},
					description:
						"Declares the image to be the primary image, which is displayed when only one image can be displayed due to space limitations only",
					available: (item: { index: number }) => item.index !== 0,
				},
			],
		},
	];

	return (
		<EuiModal onClose={closeModal}>
			<EuiModalHeader>
				<EuiModalHeaderTitle>
					{data.__typename === "Device" ? "Device" : "Device-Type"} Images
				</EuiModalHeaderTitle>
			</EuiModalHeader>

			<EuiModalBody>
				<EuiBasicTable
					items={images.filter(isNonNullish).map((r, index) => ({ ...r, index }))}
					columns={columns}
				/>
				<EuiSpacer />
				<EuiTitle size="xs">
					<h2>Upload new image</h2>
				</EuiTitle>
				<EuiSpacer size="s" />
				<ImageFileUpload callback={addImage} />
				<EuiSpacer size="s" />
				{data.__typename === "DeviceDefinition" && (
					<EuiText size={"xs"} color={"subdued"}>
						You are editing the images of a Device-Type. The images you add here will apply for all
						Devices of this Device-Type and not only for a single Device.
					</EuiText>
				)}
			</EuiModalBody>

			<EuiModalFooter>
				<EuiButton onClick={closeModal} fill>
					Close
				</EuiButton>
			</EuiModalFooter>
		</EuiModal>
	);
}
