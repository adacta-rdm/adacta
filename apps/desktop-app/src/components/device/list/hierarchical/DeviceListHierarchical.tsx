import assert from "assert";

import {
	EuiButtonIcon,
	EuiFlexGroup,
	EuiFlexItem,
	EuiTable,
	EuiTableBody,
	EuiTableHeader,
	EuiTableHeaderCell,
	EuiTableRow,
	EuiTableRowCell,
	EuiToolTip,
	useEuiTheme,
} from "@elastic/eui";
import React, { useEffect, useState } from "react";
import { graphql } from "react-relay";
import type { PreloadedQuery } from "react-relay/hooks";
import { useFragment, usePreloadedQuery } from "react-relay/hooks";

import type { IComponentTreeNode } from "../../../componentNodeTreeProvider/ComponentNodeTreeProvider";
import { createComponentNodeTree } from "../../../componentNodeTreeProvider/ComponentNodeTreeProvider";
import { UserLink } from "../../../user/UserLink";
import { PaddingHelper } from "../../../utils/PaddingHelper";
import { DeviceAdd } from "../../DeviceAdd";
import { DeviceLink } from "../../DeviceLink";
import { DevicePreviewImage } from "../../DevicePreviewImage";
import { DeviceListTemplate } from "../DeviceListTemplate";

import type {
	DeviceListHierarchicalGraphQLFragment$data,
	DeviceListHierarchicalGraphQLFragment$key,
} from "@/relay/DeviceListHierarchicalGraphQLFragment.graphql";
import type {
	DeviceListHierarchicalQuery,
	DeviceListHierarchicalQuery$data,
} from "@/relay/DeviceListHierarchicalQuery.graphql";

export const DeviceListHierarchicalGraphQLQuery = graphql`
	query DeviceListHierarchicalQuery($repositoryId: ID!, $first: Int!, $after: String) {
		repository(id: $repositoryId) {
			devicesHierarchical(first: $first, after: $after)
				@connection(key: "DeviceListHierarchical___devicesHierarchical") {
				__id
				edges {
					isNewlyCreated
					node {
						device {
							metadata {
								creator {
									id
									name
								}
							}
						}
						...DeviceListHierarchicalGraphQLFragment
					}
				}
			}
		}
		currentUser {
			payload {
				user {
					id
				}
			}
		}
	}
`;

const DeviceListHierarchicalGraphQLFragment = graphql`
	fragment DeviceListHierarchicalGraphQLFragment on HierarchicalDeviceListEntry {
		device {
			# eslint-disable-next-line relay/unused-fields
			id
			...DeviceLink
			...DevicePreviewImage
			metadata {
				creator {
					...UserLink
				}
			}
		}
		components {
			__typename
			# eslint-disable-next-line relay/unused-fields
			pathFromTopLevelDevice
			component {
				__typename
				... on Device {
					...DevicePreviewImage
					...DeviceLink
					metadata {
						creator {
							...UserLink
						}
					}
				}
			}
		}
	}
`;

export function DeviceListHierarchical(props: {
	queryRef: PreloadedQuery<DeviceListHierarchicalQuery>;
}) {
	const [deviceAddDialogOpen, setDeviceAddDialogOpen] = useState(false);
	const [isExpanded, setIsExpanded] = useState<boolean | undefined>();
	const data = usePreloadedQuery(DeviceListHierarchicalGraphQLQuery, props.queryRef);

	if (data === null) {
		return <></>;
	}

	/**
	 * Separate the top level devices of the current user from the rest
	 */
	const currentUsersTopLevelDevices: Array<
		DeviceListHierarchicalQuery$data["repository"]["devicesHierarchical"]["edges"][number]
	> = [];
	const toplevelDevices: DeviceListHierarchicalQuery$data["repository"]["devicesHierarchical"]["edges"][number][] =
		[];
	data.repository.devicesHierarchical?.edges.forEach((d) => {
		if (d.node?.device.metadata.creator.id === data.currentUser.payload.user.id) {
			currentUsersTopLevelDevices.push(d);
			return;
		}
		toplevelDevices.push(d);
	});

	const expandAllButton = (
		<EuiToolTip content={"Expand all"} delay={"long"}>
			<EuiButtonIcon
				aria-label={"Expand all"}
				iconType={"expand"}
				color={"text"}
				display={"base"}
				onClick={() => {
					setIsExpanded(true);
				}}
			/>
		</EuiToolTip>
	);

	const collapseAllButton = (
		<EuiToolTip content={"Collapse all"} delay={"long"}>
			<EuiButtonIcon
				aria-label={"Collapse all"}
				iconType={"minimize"}
				color={"text"}
				display={"base"}
				onClick={() => {
					setIsExpanded(false);
				}}
			/>
		</EuiToolTip>
	);

	return (
		<DeviceListTemplate
			mainAction={{
				type: "addDevice",
				onAddAddDevice: () => {
					setDeviceAddDialogOpen(true);
				},
			}}
			selectedTab={"hierarchical"}
		>
			{deviceAddDialogOpen && (
				<DeviceAdd
					closeModal={() => setDeviceAddDialogOpen(false)}
					connections={{ connectionIdHierarchical: [data.repository.devicesHierarchical.__id] }}
				/>
			)}
			<EuiFlexGroup justifyContent={"flexEnd"} gutterSize={"xs"}>
				{expandAllButton}
				{collapseAllButton}
			</EuiFlexGroup>
			<EuiTable>
				<HierarchicalDeviceTableHeader />

				<EuiTableBody>
					{/*Own root devices are shown on top of the table*/}
					{currentUsersTopLevelDevices.map((d, i) =>
						d.node ? (
							<HierarchicalDeviceTableRowToplevel
								data={d.node}
								key={i}
								level={0}
								isNewlyCreated={d.isNewlyCreated}
								isExpanded={isExpanded}
								setIsExpanded={setIsExpanded}
							/>
						) : null
					)}
					{/* This is a hack to make the border thicker */}
					<td colSpan={2} style={{ borderWidth: "thick" }} />{" "}
					{toplevelDevices.map((d, i) =>
						d.node ? (
							<HierarchicalDeviceTableRowToplevel
								data={d.node}
								key={i}
								level={0}
								isNewlyCreated={d.isNewlyCreated}
								isExpanded={isExpanded}
								setIsExpanded={setIsExpanded}
							/>
						) : null
					)}
				</EuiTableBody>
			</EuiTable>
		</DeviceListTemplate>
	);
}

function HierarchicalDeviceTableHeader() {
	const columns = ["Name", "Creator"];

	return (
		<EuiTableHeader>
			{columns.map((c) => (
				<EuiTableHeaderCell key={c}>{c}</EuiTableHeaderCell>
			))}
		</EuiTableHeader>
	);
}

/**
 * Table entry for a root device
 */
function HierarchicalDeviceTableRowToplevel(props: {
	level: number;
	data: DeviceListHierarchicalGraphQLFragment$key;

	isNewlyCreated?: boolean | null;

	isExpanded: boolean | undefined;
	setIsExpanded: (isExpanded: boolean | undefined) => void;
}) {
	const fragmentData = useFragment(DeviceListHierarchicalGraphQLFragment, props.data);
	const tree = createComponentNodeTree<DeviceListHierarchicalGraphQLFragment$data>(
		fragmentData.components,
		""
	);
	const { euiTheme } = useEuiTheme();

	const hasChildren = tree.length > 0;

	const [showChildren, setShowChildren] = useState(false);

	useEffect(() => {
		if (props.isExpanded !== undefined) {
			setShowChildren(props.isExpanded);
		}
	}, [props.isExpanded]);

	const expandCollapse = () => {
		setShowChildren(!showChildren);
		// Set the global expanded state to undefined, if local expanded state is manually set
		props.setIsExpanded(undefined);
	};

	return (
		<>
			<EuiTableRow
				style={props.isNewlyCreated ? { backgroundColor: euiTheme.colors.highlight } : undefined}
				onClick={expandCollapse}
			>
				<EuiTableRowCell>
					{hasChildren ? (
						<EuiButtonIcon
							aria-label={showChildren ? "Collapse" : "Expand"}
							iconType={showChildren ? "arrowDown" : "arrowRight"}
							onClick={expandCollapse}
						/>
					) : (
						<EuiButtonIcon iconType={"empty"} aria-label={" "} />
					)}
					<DevicePreviewImage data={fragmentData.device} />
					<DeviceLink data={fragmentData.device} underlineOnHover={true} />
				</EuiTableRowCell>
				<EuiTableRowCell>
					<UserLink user={fragmentData.device.metadata.creator} />
				</EuiTableRowCell>
			</EuiTableRow>
			{showChildren && (
				<DeviceTree
					nodeChildren={tree}
					path={[]}
					isExpanded={props.isExpanded}
					setIsExpanded={props.setIsExpanded}
				/>
			)}
		</>
	);
}

/**
 * Entry for devices which were used as properties by root devices
 */
function HierarchicalDeviceTableRowProperties(props: {
	child: IComponentTreeNode<DeviceListHierarchicalGraphQLFragment$data>;
	path: string[];
	isExpanded: boolean | undefined;
	setIsExpanded?: (isExpanded: boolean | undefined) => void;
}) {
	const [showChildren, setShowChildren] = useState(false);
	const hasChildren = props.child.children.length !== 0;

	const childComponent = props.child.component;

	assert(childComponent.__typename !== "%other");

	useEffect(() => {
		if (props.isExpanded !== undefined) {
			setShowChildren(props.isExpanded);
		}
	}, [props.isExpanded]);

	const expandCollapse = () => {
		setShowChildren(!showChildren);
		// Set the global expanded state to undefined, if local expanded state is manually set
		if (props.setIsExpanded) props.setIsExpanded(undefined);
	};

	return (
		<>
			<EuiTableRow onClick={expandCollapse}>
				<EuiTableRowCell>
					<PaddingHelper level={props.path.length + 1}>
						<EuiFlexGroup>
							<EuiFlexItem grow={false}>
								{hasChildren ? (
									<EuiButtonIcon
										aria-label={showChildren ? "Collapse" : "Expand"}
										iconType={showChildren ? "arrowDown" : "arrowRight"}
										onClick={expandCollapse}
									/>
								) : (
									<EuiButtonIcon iconType={"empty"} aria-label={" "} />
								)}
							</EuiFlexItem>
							{childComponent.__typename === "Device" ? (
								<>
									<EuiFlexItem grow={false}>
										<DevicePreviewImage data={childComponent} />
									</EuiFlexItem>
									<EuiFlexItem>
										{props.child.name}
										<br />
										<DeviceLink data={childComponent} />
									</EuiFlexItem>
								</>
							) : (
								// Show only slot name for virtual groups
								<>{props.child.name}</>
							)}
						</EuiFlexGroup>
					</PaddingHelper>
				</EuiTableRowCell>
				<EuiTableRowCell>
					{childComponent.__typename === "Device" && (
						<UserLink user={childComponent.metadata.creator} />
					)}
				</EuiTableRowCell>
			</EuiTableRow>
			{hasChildren && showChildren && (
				<DeviceTree
					path={[...props.path, props.child.name]}
					nodeChildren={props.child.children}
					isExpanded={props.isExpanded}
					setIsExpanded={props.setIsExpanded}
				/>
			)}
		</>
	);
}

function DeviceTree(props: {
	nodeChildren: IComponentTreeNode<DeviceListHierarchicalGraphQLFragment$data>[];
	path: string[];
	isExpanded: boolean | undefined;
	setIsExpanded?: (isExpanded: boolean | undefined) => void;
}) {
	return (
		<>
			{props.nodeChildren.map((c) => (
				<HierarchicalDeviceTableRowProperties
					child={c}
					path={props.path}
					key={[...props.path, c.name].join("/")}
					isExpanded={props.isExpanded}
					setIsExpanded={props.setIsExpanded}
				/>
			))}
		</>
	);
}
