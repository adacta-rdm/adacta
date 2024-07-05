import {
	EuiButtonGroup,
	EuiFlexGroup,
	EuiFlexItem,
	EuiLink,
	EuiSpacer,
	EuiSwitch,
	EuiTable,
	EuiTableBody,
	EuiTableHeader,
	EuiTableHeaderCell,
	EuiTableRow,
	EuiTableRowCell,
	useEuiTheme,
} from "@elastic/eui";
import type { Criteria } from "@elastic/eui/src/components/basic_table/basic_table";
import type { Direction } from "@elastic/eui/src/services/sort/sort_direction";
import { assertDefined } from "@omegadot/assert";
import React, { useState } from "react";
import type { RefetchFnDynamic } from "react-relay";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";
import type { Options } from "react-relay/relay-hooks/useRefetchableFragmentNode";

import type { PropsWithConnections } from "../../../../interfaces/PropsWithConnections";
import { useRepoRouterHook } from "../../../../services/router/RepoRouterHook";
import { ProjectListCollapsible } from "../../../project/ProjectListCollapsible";
import { UserLink } from "../../../user/UserLink";
import { AssignShortIdButton } from "../../AssignShortIdButton";
import { DeviceDelete } from "../../DeviceDelete";
import { DeviceLink } from "../../DeviceLink";
import { DevicePreviewImage } from "../../DevicePreviewImage";

import type { DeviceList$key } from "@/relay/DeviceList.graphql";
import type {
	DeviceListFragment,
	DeviceOrder,
	DevicesFilter,
} from "@/relay/DeviceListFragment.graphql";
import type { DeviceTable_devices$key } from "@/relay/DeviceTable_devices.graphql";
import { IDevicesFilter } from "~/apps/repo-server/src/graphql/generated/resolvers";
import type { ArrayElementType } from "~/lib/interface/ArrayElementType";

const DeviceTableDevicesGraphQLFragment = graphql`
	fragment DeviceTable_devices on DeviceEdge @relay(plural: true) {
		isNewlyCreated
		node {
			id
			shortId
			displayName
			specifications(names: ["manufacturer"]) {
				value
			}
			metadata {
				creator {
					...UserLink
				}
			}
			parent {
				...DeviceLink
			}
			...DevicePreviewImage
			...ProjectListCollapsible
			...DeviceDelete
		}
	}
`;

export function DeviceTable(
	props: PropsWithConnections<{
		devices: DeviceTable_devices$key;
		refetch?: RefetchFnDynamic<DeviceListFragment, DeviceList$key, Options>;

		disableActions?: boolean;
	}>
) {
	const devices = useFragment(DeviceTableDevicesGraphQLFragment, props.devices);
	const { router, repositoryId } = useRepoRouterHook();

	const [sortDirection, setSortDirection] = useState<Direction>("asc");
	const [filter, setFilter] = useState<"all" | "root" | "unused">("all");
	const [myDevicesOnly, setMyDevicesOnly] = useState(false);

	const { euiTheme } = useEuiTheme();

	// Combines the component state into the DeviceOrder value required by relay
	const constructDeviceOrder = (
		field: keyof IDevice["node"],
		direction: "asc" | "desc"
	): DeviceOrder | undefined => {
		if (direction === "asc" && field === "displayName") {
			return "NAME";
		} else if (direction === "desc" && field === "displayName") {
			return "NAME_DESC";
		}
	};

	const onTableChange = ({ sort }: Criteria<IDevice["node"]>) => {
		assertDefined(props.refetch);
		if (sort) {
			const { field, direction } = sort;
			// Fetch policy store-and-network means that the data from the store (cache) is used
			// first and then later replaced with the response from the network.
			// This is necessary because the order can become unsorted by the added edges from the
			// subscriptions. If the connection is freshly fetched from the server,
			// then the correct order returns from there
			const [f] = filterStringToFilter(filter);
			if (direction === "asc" && field === "displayName") {
				props.refetch(
					{
						order_by: constructDeviceOrder(field, direction),
						filter: f,
					},
					{ fetchPolicy: "store-and-network" }
				);
			} else if (direction === "desc" && field === "displayName") {
				props.refetch(
					{
						order_by: constructDeviceOrder(field, direction),
						filter: f,
					},
					{ fetchPolicy: "store-and-network" }
				);
			}
			setSortDirection(direction);
		}
	};

	const onSort = () => {
		const newDirection = sortDirection === "asc" ? "desc" : "asc";
		onTableChange({ sort: { field: "displayName", direction: newDirection } });
	};

	type IDevice = ArrayElementType<typeof devices>;

	function filterStringToFilter(
		optionId: string
	): ["ROOTS_ONLY" | "UNUSED_ONLY" | undefined, "all" | "root" | "unused"] {
		let filter: DevicesFilter | undefined;

		switch (optionId) {
			case "all":
				filter = undefined;
				break;
			case "root":
				filter = IDevicesFilter.RootsOnly;
				break;
			case "unused":
				filter = IDevicesFilter.UnusedOnly;
				break;
			default:
				throw new Error("Invalid filter value");
		}
		return [filter, optionId];
	}

	return (
		<>
			<EuiFlexGroup justifyContent={"flexEnd"} alignItems={"center"} direction={"row"}>
				{props.refetch && (
					<EuiSwitch
						label={"My devices only"}
						checked={myDevicesOnly}
						onChange={(e) => {
							setMyDevicesOnly(e.target.checked);
							if (props.refetch) {
								const [filterGraphQL] = filterStringToFilter(filter);
								props.refetch(
									{
										filter: filterGraphQL,
										order_by: constructDeviceOrder("displayName", sortDirection),
										showOnlyOwnDevices: e.target.checked,
									},
									{ fetchPolicy: "store-and-network" }
								);
							}
						}}
					/>
				)}
				{props.refetch !== undefined && (
					<EuiFlexItem grow={false}>
						<EuiButtonGroup
							legend={"Select Devices Filter"}
							name={"Name"}
							idSelected={filter}
							onChange={(optionId) => {
								if (props.refetch) {
									const [filterGraphQL, filter] = filterStringToFilter(optionId);
									props.refetch(
										{
											filter: filterGraphQL,
											order_by: constructDeviceOrder("displayName", sortDirection),
											showOnlyOwnDevices: myDevicesOnly,
										},
										{ fetchPolicy: "store-and-network" }
									);
									setFilter(filter);
								}
							}}
							options={[
								{
									id: "all",
									label: "All",
								},
								{
									id: "root",
									label: "Roots only",
								},
								{
									id: "unused",
									label: "Currently unused",
								},
							]}
						/>
					</EuiFlexItem>
				)}
			</EuiFlexGroup>
			<EuiSpacer size={"m"} />
			<EuiTable>
				<EuiTableHeader>
					<EuiTableHeaderCell>#</EuiTableHeaderCell>
					<EuiTableHeaderCell
						onSort={() => onSort()}
						isSortAscending={sortDirection === "asc"}
						isSorted={true}
					>
						Name
					</EuiTableHeaderCell>
					<EuiTableHeaderCell>Manufacturer</EuiTableHeaderCell>
					<EuiTableHeaderCell>Projects</EuiTableHeaderCell>
					<EuiTableHeaderCell>Creator</EuiTableHeaderCell>
					<EuiTableHeaderCell>Currently installed in</EuiTableHeaderCell>
					{!props.disableActions && <EuiTableHeaderCell align="right">Actions</EuiTableHeaderCell>}
				</EuiTableHeader>
				<EuiTableBody>
					{devices.map((d) => {
						const { node, isNewlyCreated } = d;

						return (
							<EuiTableRow
								key={d.node.id}
								style={isNewlyCreated ? { backgroundColor: euiTheme.colors.highlight } : undefined}
							>
								<EuiTableRowCell>
									{node.shortId ?? (
										<AssignShortIdButton
											deviceId={node.id}
											currentShortId={node.shortId ?? undefined}
											buttonStyle={"icon"}
										/>
									)}
								</EuiTableRowCell>
								<EuiTableRowCell>
									<DevicePreviewImage data={node} />
									<EuiLink
										onClick={() => {
											router.push("/repositories/:repositoryId/devices/:deviceId/", {
												repositoryId,
												deviceId: d.node.id,
											});
										}}
									>
										{node.displayName}
									</EuiLink>
								</EuiTableRowCell>
								<EuiTableRowCell>
									{node.specifications.length > 0 ? node.specifications[0].value : <></>}
								</EuiTableRowCell>
								<EuiTableRowCell>
									<ProjectListCollapsible data={node} />
								</EuiTableRowCell>
								<EuiTableRowCell>{<UserLink user={node.metadata.creator} />}</EuiTableRowCell>
								<EuiTableRowCell>
									{node.parent ? <DeviceLink data={node.parent} /> : <></>}
								</EuiTableRowCell>
								{!props.disableActions && (
									<EuiTableRowCell align="right">
										<DeviceDelete device={node} connections={props.connections} />
									</EuiTableRowCell>
								)}
							</EuiTableRow>
						);
					})}
				</EuiTableBody>
			</EuiTable>
		</>
	);
}
