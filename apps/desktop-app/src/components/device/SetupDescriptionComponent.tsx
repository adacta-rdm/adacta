import {
	EuiButton,
	EuiButtonIcon,
	EuiCallOut,
	EuiFlexGroup,
	EuiFlexItem,
	EuiIcon,
	EuiListGroup,
	EuiListGroupItem,
	EuiPanel,
	EuiPopover,
	EuiSpacer,
	EuiSwitch,
	EuiToolTip,
	useEuiTheme,
} from "@elastic/eui";
import { isEqual } from "lodash-es";
import React, { useState } from "react";
import type { GraphQLTaggedNode } from "react-relay";
import { graphql, useMutation } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { DeviceLink } from "./DeviceLink";
import { SetupDescriptionUpdateDates } from "./SetupDescriptionUpdateDates";
import { useRepositoryIdVariable } from "../../services/router/UseRepoId";
import type { IImageAnnotation } from "../ImageAnnotationComponent";
import { ImageAnnotationComponent } from "../ImageAnnotationComponent";
import { ImageFileUpload } from "../ImageFileUpload";
import { InfoHeadline } from "../InfoHeadline";
import type { IComponentTreeNode } from "../componentNodeTreeProvider/ComponentNodeTreeProvider";
import {
	ComponentNodeTreeProvider,
	useTree,
} from "../componentNodeTreeProvider/ComponentNodeTreeProvider";
import { DateTime } from "../datetime/DateTime";
import { ShowIfUserCanEdit } from "../originRepo/ShowIfUserCanEdit";

import type { ComponentNodeTreeProviderFragment$data } from "@/relay/ComponentNodeTreeProviderFragment.graphql";
import type {
	SetupDescriptionComponent$data,
	SetupDescriptionComponent$key,
} from "@/relay/SetupDescriptionComponent.graphql";
import type { SetupDescriptionComponentAddMutation } from "@/relay/SetupDescriptionComponentAddMutation.graphql";
import type { SetupDescriptionComponentDeleteDescriptionMutation } from "@/relay/SetupDescriptionComponentDeleteDescriptionMutation.graphql";
import type { SetupDescriptionComponentDeleteMutation } from "@/relay/SetupDescriptionComponentDeleteMutation.graphql";
import type { SetupDescriptionComponentLinkImageMutation } from "@/relay/SetupDescriptionComponentLinkImageMutation.graphql";
import type { SetupDescriptionComponentUpdateDatesMutation } from "@/relay/SetupDescriptionComponentUpdateDatesMutation.graphql";
import type { ShowIfUserCanEdit$key } from "@/relay/ShowIfUserCanEdit.graphql";
import { SampleLink } from "~/apps/desktop-app/src/components/sample/SampleLink";
import { assertDefined } from "~/lib/assert/assertDefined";
import {
	createDate,
	createIDatetime,
	createMaybeDate,
	createMaybeIDatetime,
} from "~/lib/createDate";
import type { IResourceId } from "~/lib/database/Ids";
import type { ArrayElementType } from "~/lib/interface/ArrayElementType";
import { splitPropertyNameIntoVirtualGroups } from "~/lib/utils/splitPropertyNameIntoVirtualGroups";

const SetupDescriptionGraphQLFragment = graphql`
	fragment SetupDescriptionComponent on Device @argumentDefinitions(time: { type: "DateTime" }) {
		id

		setupDescription {
			id
			begin
			end
			imageResource {
				id
				imageURI(preset: REGULAR)
				height
				width
			}
			setupLabels {
				xPos
				yPos
				propertyPath
			}
		}

		...ComponentNodeTreeProviderFragment @arguments(time: $time)
		...ShowIfUserCanEdit
	}
`;

const AddLabelGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation SetupDescriptionComponentAddMutation($repositoryId: ID!, $input: AddSetupLabelInput!) {
		repository(id: $repositoryId) {
			addSetupLabel(input: $input) {
				setupDescription {
					setupLabels {
						propertyPath
						xPos
						yPos
					}
				}
			}
		}
	}
`;

const DeleteSetupDescriptionGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation SetupDescriptionComponentDeleteDescriptionMutation(
		$repositoryId: ID!
		$input: DeleteSetupDescriptionInput!
	) {
		repository(id: $repositoryId) {
			deleteSetupDescription(input: $input) {
				setupDescription {
					__typename
				}
			}
		}
	}
`;

const DeleteLabelGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation SetupDescriptionComponentDeleteMutation(
		$repositoryId: ID!
		$input: DeleteSetupLabelInput!
	) {
		repository(id: $repositoryId) {
			deleteSetupLabel(input: $input) {
				setupDescription {
					setupLabels {
						propertyPath
						xPos
						yPos
					}
				}
			}
		}
	}
`;

const LinkSetupDescriptionImageGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation SetupDescriptionComponentLinkImageMutation(
		$repositoryId: ID!
		$input: LinkImageWithSetupDescriptionInput!
	) {
		repository(id: $repositoryId) {
			linkImageWithSetupDescription(input: $input) {
				setupDescription {
					begin
					end
					imageResource {
						imageURI(preset: REGULAR)
						height
						width
					}
					setupLabels {
						propertyPath
						xPos
						yPos
					}
				}
			}
		}
	}
`;

const UpdateTimeGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation SetupDescriptionComponentUpdateDatesMutation(
		$repositoryId: ID!
		$input: UpdateSetupDescriptionTimeInput!
	) {
		repository(id: $repositoryId) {
			updateSetupDescriptionTime(input: $input) {
				setupDescription {
					begin
					end
				}
			}
		}
	}
`;

export interface IAvailableLabel {
	tag: string;
	name: string;
	path: string[];
}

interface IProps {
	device: SetupDescriptionComponent$key;
	timestamp?: Date;
	width?: number;

	allowEdit?: boolean;
}

export function SetupDescriptionComponent(props: IProps) {
	const device = useFragment(SetupDescriptionGraphQLFragment, props.device);

	return (
		<ComponentNodeTreeProvider device={device}>
			<SetupDescriptionComponentPure {...props} data={device} />
		</ComponentNodeTreeProvider>
	);
}

function SetupDescriptionComponentPure(props: IProps & { data: SetupDescriptionComponent$data }) {
	const repositoryIdVariable = useRepositoryIdVariable();
	const { data: device } = props;
	const { tree } = useTree();
	const [deleteSetupDescriptionMutation] =
		useMutation<SetupDescriptionComponentDeleteDescriptionMutation>(
			DeleteSetupDescriptionGraphQLMutation
		);
	const [addLabelMutation] =
		useMutation<SetupDescriptionComponentAddMutation>(AddLabelGraphQLMutation);
	const [deleteLabelMutation] = useMutation<SetupDescriptionComponentDeleteMutation>(
		DeleteLabelGraphQLMutation
	);
	const [linkImageMutation] = useMutation<SetupDescriptionComponentLinkImageMutation>(
		LinkSetupDescriptionImageGraphQLMutation
	);
	const [updateTimeMutation] =
		useMutation<SetupDescriptionComponentUpdateDatesMutation>(UpdateTimeGraphQLMutation);

	const [editMode, setEditMode] = useState(false);
	const [uploadMode, setUploadMode] = useState(false);
	const [showSlotNames, setShowSlotNames] = useState(false);

	// State variables for newly uploaded images
	const [imageResourceId, setImageResourceId] = useState<IResourceId | undefined>(undefined);

	const [changeDatesForResource, setChangeDatesForResource] = useState<string | undefined>(
		undefined
	);

	const { timestamp } = props;

	const setupDescription = device.setupDescription.filter((d) => {
		return (
			createDate(d.begin) <= (props.timestamp ?? new Date()) &&
			(d.end === null || createDate(d.end) > (props.timestamp ?? new Date()))
		);
	});

	// No sub components
	if (tree.length == 0) {
		return null;
	}

	const deleteSetupDescription = (imageId: string) => {
		deleteSetupDescriptionMutation({
			variables: { input: { imageId, deviceId: device.id }, ...repositoryIdVariable },
			onError: (error) => {
				throw error;
			},
		});
	};

	const addLabel = (imageId: string, propertyPath: string[], xPos: number, yPos: number) => {
		addLabelMutation({
			variables: {
				input: { imageId, deviceId: device.id, propertyPath, xPos, yPos },
				...repositoryIdVariable,
			},
			onError: (error) => {
				throw error;
			},
		});
	};

	const deleteLabel = (imageId: string, xPos: number, yPos: number) => {
		deleteLabelMutation({
			variables: {
				input: { imageId, deviceId: device.id, xPos, yPos },
				...repositoryIdVariable,
			},
			onError: (error) => {
				throw error;
			},
		});
	};

	const linkImage = (resourceId: IResourceId, begin: Date, end?: Date) => {
		linkImageMutation({
			variables: {
				input: {
					resourceId,
					deviceId: device.id,
					begin: createIDatetime(begin),
					end: createMaybeIDatetime(end),
				},
				...repositoryIdVariable,
			},
			onError: (error) => {
				throw error;
			},
		});
	};

	const updateTime = (resourceId: string, begin: Date, end?: Date) => {
		updateTimeMutation({
			variables: {
				input: {
					resourceId,
					deviceId: device.id,
					begin: createIDatetime(begin),
					end: createMaybeIDatetime(end),
				},
				...repositoryIdVariable,
			},
			onError: (error) => {
				throw error;
			},
		});
	};

	type SetupLabels = ArrayElementType<typeof setupDescription>["setupLabels"];

	const componentTree = tree;
	const createAnnotations = (
		tree: IComponentTreeNode<ComponentNodeTreeProviderFragment$data>[],
		setupLabels: SetupLabels,
		propertyPath: string[] = []
	): [IImageAnnotation[], IAvailableLabel[]] => {
		const annotations: IImageAnnotation[] = [];
		const unlabeledComponents: IAvailableLabel[] = [];
		for (const node of tree) {
			let newPropertyPath: string[];
			if (node.component.__typename === "Device" || node.component.__typename === "Sample") {
				newPropertyPath = splitPropertyNameIntoVirtualGroups([
					...propertyPath,
					node.component.usagesAsProperty[0].name,
				]);
				const setupLabel = setupLabels.find((l) => isEqual(l.propertyPath, newPropertyPath));
				if (setupLabel) {
					annotations.push({
						x: setupLabel.xPos,
						y: setupLabel.yPos,
						label:
							node.component.__typename === "Device" ? (
								<DeviceLink
									data={node.component.usagesAsProperty[0].value}
									timestamp={timestamp}
									textOverwrite={showSlotNames ? node.name : node.tag}
								/>
							) : (
								<SampleLink sample={node.component.usagesAsProperty[0].value} />
							),
					});
				} else {
					// List all components that are not described in the setup description
					// This list is rendered in the callout above the edit mode
					unlabeledComponents.push({
						path: newPropertyPath,
						tag: node.tag,
						name: node.name,
					});
				}
				// If we ever decide to show samples in the setup description: Implement case here.
				const children = createAnnotations(node.children, setupLabels, newPropertyPath);
				annotations.push(...children[0]);
				unlabeledComponents.push(...children[1]);
			}
		}
		return [annotations, unlabeledComponents];
	};

	const [, unlabeledComponents] = createAnnotations(
		componentTree,
		setupDescription.flatMap((s) => s.setupLabels)
	);

	const editInfo = (
		<>
			<EuiCallOut title="You are now in edit mode" iconType="documentEdit">
				In the setup description, a graphic of the setup is provided with markers that describe
				which component is visible at this position in the graphic.
				<EuiSpacer size="s" />
				{unlabeledComponents.length ? (
					<>
						The following components are not described in setup description:
						<EuiListGroup flush={true}>
							{unlabeledComponents.map((a, index) => (
								<EuiListGroupItem label={a.name} key={index} />
							))}
						</EuiListGroup>
						To place a new label for those components simply click onto the image itself.
					</>
				) : (
					<>All components are already described</>
				)}
				<EuiSpacer />
				<EuiButton onClick={() => setEditMode(false)}>Leave edit mode</EuiButton>{" "}
				{!uploadMode && <EuiButton onClick={() => setUploadMode(true)}>Upload new image</EuiButton>}
			</EuiCallOut>
			<EuiSpacer />
		</>
	);

	return (
		<>
			<InfoHeadline
				name="Setup"
				tooltip="Shows the current setup. Hover over the tags to get more information about individual components."
				extraElementsLeft={[
					<EditButton
						key={"editButton"}
						allowEdit={props.allowEdit}
						metadata={device}
						editMode={editMode}
						setEditMode={setEditMode}
					/>,
				]}
				extraElementRight={[
					<ShowSlotNamesSwitch
						key={"showSlotNamesSwitch"}
						showSlotNames={showSlotNames}
						setShowSlotNames={setShowSlotNames}
					/>,
				]}
			/>
			<EuiSpacer size="s" />
			{editMode && editInfo}
			{uploadMode && (
				<>
					<EuiPanel>
						<EuiFlexGroup>
							<EuiFlexItem>
								<InfoHeadline
									name={"Upload Image"}
									tooltip={
										"Allows you to upload an additional image which describes the setup. After the upload you'll be able to place annotation labels on top of the image."
									}
								/>
								<ImageFileUpload
									disableAutoClear={true} // We want to keep the file in the input field as this file is part of a form with multiple inputs
									callback={(r) => {
										setImageResourceId(r);
									}}
								/>
								<SetupDescriptionUpdateDates
									submitDisabled={imageResourceId === undefined}
									onSubmit={(imageBegin, imageEnd) => {
										assertDefined(imageResourceId);
										linkImage(imageResourceId, imageBegin, imageEnd);
										setUploadMode(false);
									}}
								/>
							</EuiFlexItem>
							<EuiFlexItem grow={false}>
								<EuiToolTip content={"Abort the image upload"}>
									<EuiButtonIcon
										iconType={"cross"}
										onClick={() => setUploadMode(false)}
										aria-label={"Abort upload"}
									/>
								</EuiToolTip>
							</EuiFlexItem>
						</EuiFlexGroup>
					</EuiPanel>
					<EuiSpacer />
				</>
			)}
			{setupDescription.flatMap((s) => {
				if (s.imageResource === null) {
					// TODO: Just skipping the setup description image is misleading
					return [];
				}

				const [annotations] = createAnnotations(componentTree, s.setupLabels);
				return (
					<div key={s.imageResource.id}>
						<EuiPanel>
							<EuiFlexGroup>
								<EuiFlexItem>
									<ImageAnnotationComponent
										imageSource={s.imageResource.imageURI}
										imageHeight={s.imageResource.height}
										imageWidth={s.imageResource.width}
										annotations={annotations}
										caption={
											<>
												Shows setup from <DateTime date={createDate(s.begin)} /> until{" "}
												<DateTime date={createMaybeDate(s.end)} undefinedMeansNow />
											</>
										}
										width={props.width}
										options={
											editMode
												? {
														allowEdit: true,
														availableLabels: unlabeledComponents,
														onAddLabel: (v, x, y) => {
															assertDefined(s.imageResource, "addLabel on undefined resource");
															addLabel(s.imageResource.id, v, x, y);
														},
														onDeleteLabel: (x, y) => {
															assertDefined(s.imageResource, "deleteLabel on undefined resource");
															deleteLabel(s.imageResource.id, x, y);
														},
												  }
												: undefined
										}
									/>
								</EuiFlexItem>
								{editMode && (
									<>
										<EuiFlexItem grow={false}>
											<EuiToolTip content={"Update the time"}>
												<EuiPopover
													button={
														<EuiButtonIcon
															iconType={"continuityWithin"}
															onClick={() => {
																assertDefined(s.imageResource, "change date on undefined resource");
																setChangeDatesForResource(s.imageResource.id);
															}}
															aria-label={"Update dates"}
														/>
													}
													isOpen={changeDatesForResource === s.imageResource.id}
													closePopover={() => setChangeDatesForResource(undefined)}
												>
													<SetupDescriptionUpdateDates
														initialBegin={createDate(s.begin)}
														initialEnd={createMaybeDate(s.end)}
														onSubmit={(imageBegin, imageEnd) => {
															assertDefined(s.imageResource);
															updateTime(s.imageResource.id, imageBegin, imageEnd);
															setChangeDatesForResource(undefined);
														}}
													/>
												</EuiPopover>
											</EuiToolTip>
										</EuiFlexItem>
										<EuiFlexItem grow={false}>
											<EuiToolTip content={"Delete this image (including all the labels)"}>
												<EuiButtonIcon
													iconType={"cross"}
													onClick={() => {
														assertDefined(
															s.imageResource,
															"deleteSetupDescription on undefined resource"
														);
														deleteSetupDescription(s.imageResource.id);
													}}
													aria-label={"Delete Image"}
												/>
											</EuiToolTip>
										</EuiFlexItem>
									</>
								)}
							</EuiFlexGroup>
						</EuiPanel>
						<EuiSpacer />
					</div>
				);
			})}
		</>
	);
}

function ShowSlotNamesSwitch(props: {
	showSlotNames: boolean;
	setShowSlotNames: (show: boolean) => void;
}) {
	const { euiTheme } = useEuiTheme();

	return (
		<EuiSwitch
			compressed={true}
			label={"Show slot names"}
			labelProps={{
				// Usually the EUI Switch is quite splashy. These overrides make it a bit more subtle
				style: {
					color: euiTheme.colors.subduedText,
					fontWeight: "normal",
					paddingLeft: "2px",
				},
			}}
			checked={props.showSlotNames}
			onChange={(e) => props.setShowSlotNames(e.target.checked)}
		/>
	);
}

function EditButton(props: {
	allowEdit: boolean | undefined;
	metadata: ShowIfUserCanEdit$key;
	editMode: boolean;
	setEditMode: (editMode: boolean) => void;
}) {
	if (!props.allowEdit) {
		return <></>;
	}

	return (
		<ShowIfUserCanEdit key="editButtonWrapper" metadata={props.metadata}>
			<EuiIcon
				type="documentEdit"
				size="s"
				onClick={() => {
					props.setEditMode(!props.editMode);
				}}
			/>
		</ShowIfUserCanEdit>
	);
}
