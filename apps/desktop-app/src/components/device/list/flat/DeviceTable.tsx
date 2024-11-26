import {
	EuiLink,
	EuiSpacer,
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
import type { DeviceListFragment, DeviceOrder } from "@/relay/DeviceListFragment.graphql";
import type { DeviceTable_devices$key } from "@/relay/DeviceTable_devices.graphql";
import { SearchEmptyPrompt } from "~/apps/desktop-app/src/components/search/list/SearchEmptyPrompt";
import { IDevicesUsage } from "~/apps/repo-server/src/graphql/generated/resolvers";
import { assertDefined } from "~/lib/assert/assertDefined";
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
		refetch?: RefetchFnDynamic<DeviceListFragment, DeviceList$key, Options>; //refetch is not taking from Context because DeviceTable component is also used without SearchBar
		disableActions?: boolean;
	}>
) {
	const devices = useFragment(DeviceTableDevicesGraphQLFragment, props.devices);
	const { router, repositoryId } = useRepoRouterHook();

	const [sortDirection, setSortDirection] = useState<Direction>("asc");

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
			if (direction === "asc" && field === "displayName") {
				props.refetch({ order_by: constructDeviceOrder(field, direction) });
			} else if (direction === "desc" && field === "displayName") {
				props.refetch({ order_by: constructDeviceOrder(field, direction) });
			}
			setSortDirection(direction);
		}
	};

	const onSort = () => {
		const newDirection = sortDirection === "asc" ? "desc" : "asc";
		onTableChange({ sort: { field: "displayName", direction: newDirection } });
	};

	type IDevice = ArrayElementType<typeof devices>;

	return (
		<>
			<EuiSpacer size={"m"} />
			<EuiTable>
				{devices.length === 0 ? (
					<SearchEmptyPrompt />
				) : (
					<>
						<DeviceTableHeader
							onSort={props.refetch ? onSort : undefined} //Sorting is not possible without refetch
							sortDirection={sortDirection}
							disableActions={props.disableActions}
						/>
						<EuiTableBody>
							{devices.map((d) => {
								const { node, isNewlyCreated } = d;

								return (
									<EuiTableRow
										key={d.node.id}
										style={
											isNewlyCreated ? { backgroundColor: euiTheme.colors.highlight } : undefined
										}
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
					</>
				)}
			</EuiTable>
		</>
	);
}

export function filterStringToFilter(
	optionId: string
): ["ROOTS_ONLY" | "UNUSED_ONLY" | undefined, "all" | "root" | "unused"] {
	let filter: IDevicesUsage | undefined;

	switch (optionId) {
		case "all":
			filter = undefined;
			break;
		case "root":
			filter = IDevicesUsage.RootsOnly;
			break;
		case "unused":
			filter = IDevicesUsage.UnusedOnly;
			break;
		default:
			throw new Error("Invalid filter value");
	}
	return [filter, optionId];
}

export function DeviceTableHeader({
	sortDirection,
	onSort,
	disableActions,
}: {
	sortDirection: "asc" | "desc";
	onSort?: () => void;
	disableActions?: boolean;
}) {
	return (
		<EuiTableHeader>
			<EuiTableHeaderCell>#</EuiTableHeaderCell>
			<EuiTableHeaderCell
				onSort={onSort ? () => onSort() : undefined}
				isSortAscending={sortDirection === "asc"}
				isSorted={true}
			>
				Name
			</EuiTableHeaderCell>
			<EuiTableHeaderCell>Manufacturer</EuiTableHeaderCell>
			<EuiTableHeaderCell>Projects</EuiTableHeaderCell>
			<EuiTableHeaderCell>Creator</EuiTableHeaderCell>
			<EuiTableHeaderCell>Currently installed in</EuiTableHeaderCell>
			{!disableActions && <EuiTableHeaderCell align="right">Actions</EuiTableHeaderCell>}
		</EuiTableHeader>
	);
}
