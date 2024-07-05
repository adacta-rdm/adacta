import assert from "assert";

import {
	EuiBadge,
	EuiButton,
	EuiEmptyPrompt,
	EuiFlexGroup,
	EuiFlexItem,
	EuiIcon,
	EuiLoadingSpinner,
	EuiOverlayMask,
	EuiSpacer,
	EuiToolTip,
	EuiTreeView,
} from "@elastic/eui";
import type { Node } from "@elastic/eui/src/components/tree_view/tree_view";
import React, { useState } from "react";
import type { GraphQLTaggedNode } from "react-relay";
import { graphql, useMutation } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { DeviceLink } from "./DeviceLink";
import {
	AddComponentUsageModal,
	AddComponentUsageModalLazy,
} from "./modals/AddComponentUsageModal";
import type { IExistingProperty } from "./modals/AddOrEditComponentUsageModal";
import {
	EditComponentUsageModal,
	EditComponentUsageModalLazy,
} from "./modals/EditComponentUsageModal";
import { RemoveComponentModal } from "./modals/RemoveComponentModal";
import { SwapComponentModalLazy } from "./modals/SwapComponentModal";
import { useService } from "../../services/ServiceProvider";
import { useRepoRouterHook } from "../../services/router/RepoRouterHook";
import { useRepositoryIdVariable } from "../../services/router/UseRepoId";
import { ToasterService } from "../../services/toaster/ToasterService";
import { InfoHeadline } from "../InfoHeadline";
import { Link } from "../Link";
import type { IComponentTreeNode } from "../componentNodeTreeProvider/ComponentNodeTreeProvider";
import {
	ComponentNodeTreeProvider,
	useTree,
} from "../componentNodeTreeProvider/ComponentNodeTreeProvider";
import { DateTime } from "../datetime/DateTime";
import type { AdactaIconTypes } from "../icons/AdactaIcon";
import { AdactaIcon } from "../icons/AdactaIcon";
import { ShowIfUserCanEdit } from "../originRepo/ShowIfUserCanEdit";

import type { ComponentEuiTree$data, ComponentEuiTree$key } from "@/relay/ComponentEuiTree.graphql";
import type { ComponentEuiTreeRemoveComponentMutation } from "@/relay/ComponentEuiTreeRemoveComponentMutation.graphql";
import type { ComponentNodeTreeProviderFragment$data } from "@/relay/ComponentNodeTreeProviderFragment.graphql";
import { createIDatetime, createMaybeIDatetime } from "~/lib/createDate";

const ComponentEuiTreeGraphQLFragment = graphql`
	fragment ComponentEuiTree on Device
	@argumentDefinitions(timeFrame: { type: "TimeFrameInput" }, time: { type: "DateTime" }) {
		id
		name
		...ComponentNodeTreeProviderFragment @arguments(timeFrame: $timeFrame, time: $time)
		# eslint-disable-next-line relay/must-colocate-fragment-spreads
		...AddOrEditComponentUsageModalFragment
		...ShowIfUserCanEdit
	}
`;

const RemoveComponentGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation ComponentEuiTreeRemoveComponentMutation(
		$repositoryId: ID!
		$input: RemoveComponentInput!
		$time: DateTime
	) {
		repository(id: $repositoryId) {
			removeComponent(input: $input) {
				...DeviceOverview @arguments(time: $time)
			}
		}
	}
`;

interface IProps {
	device: ComponentEuiTree$key;
	viewTimestamp?: Date;
	/**
	 * Enables popover mode in which DeviceOverview won't render some information (i.e. SetupDescription)
	 */
	popoverMode?: boolean;

	/**
	 * Show link to property value (default: true)
	 */
	renderPropertyValue?: boolean;

	historyMode?: boolean;
}

interface IPropsPure extends IProps {
	data: ComponentEuiTree$data;
}

export function ComponentEuiTree(props: IProps) {
	const data = useFragment(ComponentEuiTreeGraphQLFragment, props.device);

	return (
		<ComponentNodeTreeProvider device={data}>
			<ComponentEuiTreePure {...props} data={data} />
		</ComponentNodeTreeProvider>
	);
}

function ComponentEuiTreePure(props: IPropsPure) {
	const toaster = useService(ToasterService);
	const renderPropertyValue = props.renderPropertyValue ?? true;
	const { popoverMode, historyMode, data } = props;
	const { router, repositoryId } = useRepoRouterHook();
	const { tree, components } = useTree();
	const [editMode, setEditMode] = useState(false);

	const repositoryIdVariable = useRepositoryIdVariable();

	const [commitRemoveComponents, removeComponentsMutationInFlight] =
		useMutation<ComponentEuiTreeRemoveComponentMutation>(RemoveComponentGraphQLMutation);

	const [addComponentModalOpenForDeviceId, setAddComponentModalOpenForDeviceId] = useState<
		string | undefined
	>();
	const [removeComponentModalOpenForDeviceId, setRemoveComponentModalOpenForDeviceId] = useState<
		string | undefined
	>();
	const [editComponentModalOpen, setEditComponentModalOpen] = useState<
		(IExistingProperty & { deviceId: string }) | undefined
	>();
	const [swapComponentModalOpen, setSwapComponentModalOpen] = useState<
		undefined | { deviceId: string; propertyId: string }
	>();

	function removeComponent(componentId: string, parentId: string, begin: Date, end?: Date) {
		commitRemoveComponents({
			variables: {
				input: {
					componentId,
					returnedDeviceId: data.id,
					begin: createIDatetime(begin),
					end: end ? createIDatetime(end) : undefined,
				},
				time: createMaybeIDatetime(props.viewTimestamp),
				...repositoryIdVariable,
			},
			onError: (e) => toaster.addToast("Delete component failed", e.message, "danger"),
		});
	}

	const createComponentEuiTree = (
		tree: IComponentTreeNode<ComponentNodeTreeProviderFragment$data>[],
		depthString = ""
	): Node[] => {
		const nodes = tree.map((node, i) => {
			// Identify properties which change within timeframe
			const propertyNameCountMap: { [key: string]: number } = {};
			const propertyNames = node.children
				.map((p) => p.name)
				.reduce((accumulator, currentValue) => {
					if (!accumulator[currentValue]) accumulator[currentValue] = 0;
					accumulator[currentValue]++;
					return accumulator;
				}, propertyNameCountMap);
			const duplicateNames = Object.entries(propertyNames)
				.filter(([, value]) => value > 1)
				.map(([name]) => name);

			let link: JSX.Element;
			let iconType: AdactaIconTypes;
			switch (node.component.__typename) {
				case "Sample":
					link = (
						<Link
							to={[
								"/repositories/:repositoryId/samples/:sampleId",
								{ repositoryId, sampleId: node.component.id },
							]}
						>
							{node.component.name}
						</Link>
					);
					iconType = "Sample";
					break;
				case "Device":
					link = (
						<DeviceLink
							repositoryId={repositoryId}
							data={node.component.usagesAsProperty[0].value}
							timestamp={props.viewTimestamp}
							popoverMode={popoverMode}
						/>
					);
					iconType = "Device";
					break;
				case "virtualGroup":
					link = <></>;
					iconType = "VirtualGroup";
					break;
				default:
					throw new Error("Unreachable");
			}

			const actions =
				node.component.__typename === "virtualGroup" ? (
					<></>
				) : (
					<>
						{node.component.__typename === "Device" && (
							<EuiFlexItem grow={false}>
								<EuiToolTip content={`Add a component to ${node.name} slot.`}>
									<div
										className="euiButtonIcon euiButtonIcon--success euiButtonIcon--empty euiButtonIcon--xSmall"
										onClick={(e) => {
											// This div acts as a button (plus icon) inside
											// another button (row of the tree component). To
											// avoid a click on the tree element the propagation
											// has to be stopped.
											e.stopPropagation();
											assert(
												node.component.__typename !== "%other" &&
													node.component.__typename !== "virtualGroup"
											);
											setAddComponentModalOpenForDeviceId(node.component.id);
										}}
									>
										<EuiIcon type="plusInCircle" />
									</div>
								</EuiToolTip>
							</EuiFlexItem>
						)}

						<EuiFlexItem grow={false}>
							<EuiToolTip content={`Remove usage from ${node.name} slot.`}>
								<div
									className="euiButtonIcon euiButtonIcon--danger euiButtonIcon--empty euiButtonIcon--xSmall"
									onClick={(e) => {
										// This div acts as a button (minus icon) inside
										// another button (row of the tree component). To
										// avoid a click on the tree element the propagation
										// has to be stopped.
										e.stopPropagation();
										assert(
											node.component.__typename !== "%other" &&
												node.component.__typename !== "virtualGroup"
										);
										setRemoveComponentModalOpenForDeviceId(node.component.id);
									}}
								>
									{removeComponentsMutationInFlight ? (
										<EuiLoadingSpinner size="s" />
									) : (
										<EuiIcon type="minusInCircle" />
									)}
								</div>
							</EuiToolTip>
						</EuiFlexItem>

						<EuiFlexItem grow={false}>
							<EuiToolTip content={`Edit ${node.component.name} usage in ${node.name} slot.`}>
								<div
									className="euiButtonIcon euiButtonIcon--danger euiButtonIcon--empty euiButtonIcon--xSmall"
									onClick={(e) => {
										// This div acts as a button (pencil icon) inside
										// another button (row of the tree component). To
										// avoid a click on the tree element the propagation
										// has to be stopped.
										assert(
											node.component.__typename !== "%other" &&
												node.component.__typename !== "virtualGroup"
										);
										assert(node.component.usagesAsProperty[0].device?.id);
										e.stopPropagation();
										setEditComponentModalOpen({
											deviceId: node.component.usagesAsProperty[0].device.id,
											propertyId: node.component.usagesAsProperty[0].id,
											begin: new Date(node.component.usagesAsProperty[0].timestamp),
											end: node.component.usagesAsProperty[0].timestampEnd
												? new Date(node.component.usagesAsProperty[0].timestampEnd)
												: undefined,
											slot: node.component.usagesAsProperty[0].name,
											component: node.component.id,
										});
									}}
								>
									{removeComponentsMutationInFlight ? (
										<EuiLoadingSpinner size="s" />
									) : (
										<EuiIcon type="pencil" />
									)}
								</div>
							</EuiToolTip>
						</EuiFlexItem>

						<EuiFlexItem grow={false}>
							<EuiToolTip content={`Swap ${node.component.name} in ${node.name} slot.`}>
								<div
									className="euiButtonIcon euiButtonIcon--danger euiButtonIcon--empty euiButtonIcon--xSmall"
									onClick={(e) => {
										// This div acts as a button (inputOutput icon) inside
										// another button (row of the tree component). To
										// avoid a click on the tree element the propagation
										// has to be stopped.
										assert(
											node.component.__typename !== "%other" &&
												node.component.__typename !== "virtualGroup"
										);
										assert(node.component.usagesAsProperty[0].device?.id);
										e.stopPropagation();
										setSwapComponentModalOpen({
											deviceId: node.component.usagesAsProperty[0].device.id,
											propertyId: node.component.usagesAsProperty[0].id,
										});
									}}
								>
									{removeComponentsMutationInFlight ? (
										<EuiLoadingSpinner size="s" />
									) : (
										<EuiIcon type="inputOutput" />
									)}
								</div>
							</EuiToolTip>
						</EuiFlexItem>
					</>
				);

			const treeEntryId =
				node.component.__typename == "virtualGroup"
					? depthString // virtualGroup does not have an ID. Not sure if this is the best way to handle it
					: node.component.id;

			return {
				id: treeEntryId,
				label: (
					<EuiFlexGroup style={{ width: "100%" }} justifyContent="spaceBetween">
						<EuiFlexItem>
							<EuiFlexGroup alignItems="center" gutterSize="s">
								<EuiFlexItem grow={false}>
									<EuiBadge color="hollow" iconType="tag">
										{depthString}
										{String(i + 1)}
									</EuiBadge>
								</EuiFlexItem>
								<EuiFlexItem grow={false}>{node.name}</EuiFlexItem>
								{duplicateNames.length > 0 && (
									<EuiFlexItem grow={false}>
										<EuiBadge color="warning" iconType="alert">
											Property {duplicateNames.join(", ")} of {link} changes over time
										</EuiBadge>
									</EuiFlexItem>
								)}
							</EuiFlexGroup>
						</EuiFlexItem>
						{renderPropertyValue && (
							<EuiFlexItem grow={false}>
								<EuiFlexItem grow={false}>{link}</EuiFlexItem>
							</EuiFlexItem>
						)}
						{/*// Cannot use EuiButtonIcon since the rows in the tree are also*/}
						{/*// <button>s, which would trigger an invalid DOM error (nested*/}
						{/*// buttons are not allowed)*/}
						{/*// Only show add button if the component is a device and has slots to
						install other components*/}
						{!popoverMode && editMode && actions}
					</EuiFlexGroup>
				),
				className: "customEuiTreeWideLabel",
				icon: <AdactaIcon type={iconType} />,
				...(node.children.length > 0 && {
					children: createComponentEuiTree(node.children, `${depthString + String(i + 1)}.`),
				}),
			};
		});
		if (depthString.length === 0 && !popoverMode) {
			return [
				...nodes,
				{
					id: "add component",
					label: (
						<ShowIfUserCanEdit metadata={data}>
							<EuiFlexGroup style={{ width: "100%" }} justifyContent="spaceBetween">
								<EuiFlexItem>
									<EuiFlexGroup alignItems="center" gutterSize="s">
										<EuiFlexItem
											grow={false}
											onClick={() => setAddComponentModalOpenForDeviceId(data.id)}
										>
											Add component
										</EuiFlexItem>
									</EuiFlexGroup>
								</EuiFlexItem>

								{/*// Cannot use EuiButtonIcon since the rows in the tree are also*/}
								{/*// <button>s, which would trigger an invalid DOM error (nested*/}
								{/*// buttons are not allowed)*/}
								<EuiFlexItem grow={false}>
									<EuiToolTip content={`Add a component to parent device.`}>
										<div
											className="euiButtonIcon euiButtonIcon--success euiButtonIcon--empty euiButtonIcon--xSmall"
											onClick={(e) => {
												// This div acts as a button (plus icon) inside
												// another button (row of the tree component). To
												// avoid a click on the tree element the propagation
												// has to be stopped.
												e.stopPropagation();
												setAddComponentModalOpenForDeviceId(data.id);
											}}
										>
											<EuiIcon type="plusInCircle" />
										</div>
									</EuiToolTip>
								</EuiFlexItem>
							</EuiFlexGroup>
						</ShowIfUserCanEdit>
					),
					className: "customEuiTreeWideLabel",
					icon: (
						<ShowIfUserCanEdit metadata={data}>
							<EuiIcon type="listAdd" />
						</ShowIfUserCanEdit>
					),
				},
			];
		}
		return nodes;
	};

	const renderModals = () => {
		return (
			<>
				{addComponentModalOpenForDeviceId && (
					<EuiOverlayMask>
						{data.id === addComponentModalOpenForDeviceId ? (
							<AddComponentUsageModal
								device={data}
								deviceId={addComponentModalOpenForDeviceId}
								onClose={() => setAddComponentModalOpenForDeviceId(undefined)}
								viewDeviceId={data.id}
								viewTimestamp={props.viewTimestamp}
							/>
						) : (
							<AddComponentUsageModalLazy
								deviceId={addComponentModalOpenForDeviceId}
								onClose={() => setAddComponentModalOpenForDeviceId(undefined)}
								viewDeviceId={data.id}
								viewTimestamp={props.viewTimestamp}
							/>
						)}
					</EuiOverlayMask>
				)}
				{editComponentModalOpen && (
					<EuiOverlayMask>
						{data.id === editComponentModalOpen.deviceId ? (
							// If we edit a property of the device we are already viewing we can use
							// the information from the fragment
							<EditComponentUsageModal
								device={data}
								deviceId={editComponentModalOpen.deviceId}
								existingProperty={editComponentModalOpen}
								onClose={() => setEditComponentModalOpen(undefined)}
								viewDeviceId={data.id}
								viewTimestamp={props.viewTimestamp}
							/>
						) : (
							// If we edit a property of a sub-device we need to lazily fetch the
							// required information
							<EditComponentUsageModalLazy
								deviceId={editComponentModalOpen.deviceId}
								existingProperty={editComponentModalOpen}
								onClose={() => setEditComponentModalOpen(undefined)}
								viewDeviceId={data.id}
								viewTimestamp={props.viewTimestamp}
							/>
						)}
					</EuiOverlayMask>
				)}
				{removeComponentModalOpenForDeviceId && (
					<EuiOverlayMask>
						<RemoveComponentModal
							topLevelDeviceId={data.id}
							pathFromTopLevelDevice={[
								// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
								...components.find((c) => {
									assert(c.component.__typename !== "%other");
									return (
										c.component.__typename !== "virtualGroup" &&
										c.component.id === removeComponentModalOpenForDeviceId
									);
								})!.pathFromTopLevelDevice,
							]}
							onClose={() => setRemoveComponentModalOpenForDeviceId(undefined)}
							onSubmit={(componentID, start, end) => {
								removeComponent(componentID, removeComponentModalOpenForDeviceId, start, end);
								setRemoveComponentModalOpenForDeviceId(undefined);
							}}
						/>
					</EuiOverlayMask>
				)}
				{swapComponentModalOpen && (
					<EuiOverlayMask>
						<SwapComponentModalLazy
							deviceId={swapComponentModalOpen.deviceId}
							onClose={() => setSwapComponentModalOpen(undefined)}
							propertyId={swapComponentModalOpen.propertyId}
							viewDeviceId={data.id}
							viewTimestamp={props.viewTimestamp}
						/>
					</EuiOverlayMask>
				)}
			</>
		);
	};

	if (components.length === 0) {
		const timeDescription = historyMode ? (
			<>
				at <DateTime date={props.viewTimestamp} />.
			</>
		) : (
			"right now"
		);
		return (
			<>
				{renderModals()}
				<EuiEmptyPrompt
					iconType="cloudDrizzle"
					title={<h2>No components</h2>}
					body={<p>This device doesn&apos;t have any sub components {timeDescription}.</p>}
					actions={
						!popoverMode ? (
							<ShowIfUserCanEdit metadata={data}>
								<EuiButton onClick={() => setAddComponentModalOpenForDeviceId(data.id)}>
									Add component
								</EuiButton>
							</ShowIfUserCanEdit>
						) : (
							<EuiButton
								onClick={() =>
									router.push("/repositories/:repositoryId/devices/:deviceId/", {
										repositoryId,
										deviceId: data.id,
									})
								}
							>
								Open {data.name}
							</EuiButton>
						)
					}
				/>
			</>
		);
	}
	return (
		<>
			{renderModals()}
			<InfoHeadline
				name="Components"
				tooltip="Shows all the components of the current device. The tags can be used to identify components in the setup below."
				extraElementsLeft={
					!popoverMode
						? [
								<ShowIfUserCanEdit key="editButtonWrapper" metadata={data}>
									<EuiIcon
										type="documentEdit"
										size="s"
										onClick={() => {
											setEditMode(!editMode);
										}}
									/>
								</ShowIfUserCanEdit>,
						  ]
						: undefined
				}
			/>
			<EuiSpacer size="s" />
			<EuiTreeView
				showExpansionArrows
				expandByDefault
				items={createComponentEuiTree(tree)}
				aria-label="Tree view of all components which are part of the device"
			/>
		</>
	);
}
