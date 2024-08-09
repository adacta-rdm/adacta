import { EuiFlexGroup } from "@elastic/eui";
import React, { createContext, Suspense, useState } from "react";
import type { RefetchFnDynamic } from "react-relay";
import type { PreloadedQuery } from "react-relay/hooks";

import type { DeviceList$key } from "@/relay/DeviceList.graphql";
import type {
	DeviceListFragment,
	DeviceListFragment$variables,
} from "@/relay/DeviceListFragment.graphql";
import type { DeviceListQuery } from "@/relay/DeviceListQuery.graphql";
import { DeviceListTemplate } from "~/apps/desktop-app/src/components/device/list/DeviceListTemplate";
import {
	DeviceList,
	DeviceListLoading,
} from "~/apps/desktop-app/src/components/device/list/flat/DeviceList";
import { DeviceUsageFilter } from "~/apps/desktop-app/src/components/device/list/flat/DeviceUsageFilter";
import { SearchBar } from "~/apps/desktop-app/src/components/search/list/SearchBar";
import { mergeGraphQLVariables } from "~/lib/utils/mergeGraphQLVariables";

export function DeviceListPage(props: { queryRef: PreloadedQuery<DeviceListQuery> }) {
	const [deviceAddDialogOpen, setDeviceAddDialogOpen] = useState(false);

	/**
	 * Do not move the usePaginationFragment into this component, to avoid having to store refetch in a state,
	 * or it will suspend the entire component including the search bar, usage filter and table header.
	 */
	const [refetch, setRefetch] = useState<RefetchFnDynamic<DeviceListFragment, DeviceList$key>>();
	const [deviceListVariables, setDeviceListVariables] = useState<
		Partial<DeviceListFragment$variables>
	>({});
	return (
		<DeviceListTemplate
			mainAction={{ type: "addDevice", onAddAddDevice: () => setDeviceAddDialogOpen(true) }}
			selectedTab={"flat"}
		>
			<DeviceListPageContext.Provider
				value={{
					refetch: (newVars: Partial<DeviceListFragment$variables>) => {
						const mergedVariables = mergeGraphQLVariables(deviceListVariables, newVars);
						setDeviceListVariables(mergedVariables);
						if (refetch) {
							refetch(mergedVariables, {
								fetchPolicy: "store-and-network",
							});
						}
					},
				}}
			>
				<EuiFlexGroup justifyContent={"spaceBetween"} alignItems={"flexStart"} direction={"row"}>
					<SearchBar
						freeTextSearch={true}
						filterFields={["Project", "Creator"]}
						preservationId={"deviceList"}
						searchBarContext={DeviceListPageContext}
					/>
					<DeviceUsageFilter />
				</EuiFlexGroup>
				<Suspense fallback={<DeviceListLoading />}>
					<DeviceList
						queryRef={props.queryRef}
						deviceAddDialogOpen={deviceAddDialogOpen}
						setDeviceAddDialogOpen={setDeviceAddDialogOpen}
						setRefetch={setRefetch}
					/>
				</Suspense>
			</DeviceListPageContext.Provider>
		</DeviceListTemplate>
	);
}

interface IDeviceListPageContext {
	refetch?: (newVars: Partial<DeviceListFragment$variables>) => void;
}

export const DeviceListPageContext = createContext<IDeviceListPageContext>({});
