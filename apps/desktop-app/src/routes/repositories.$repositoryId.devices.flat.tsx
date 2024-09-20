import { EuiSkeletonText } from "@elastic/eui";
import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import { DeviceListTemplate } from "../components/device/list/DeviceListTemplate";
import { DeviceListGraphQLQuery } from "../components/device/list/flat/DeviceList";

import type { DeviceListQuery } from "@/relay/DeviceListQuery.graphql";
import type { GetDataArgs, Props } from "@/routes/repositories.$repositoryId.devices.flat";
import { DeviceListPage } from "~/apps/desktop-app/src/components/device/list/flat/DeviceListPage";
import { getStoredSelectedSearchItems } from "~/apps/desktop-app/src/components/search/list/SearchBar";
import { CURRENT_USER_ID_PLACEHOLDER } from "~/lib/CURRENT_USER_ID_PLACEHOLDER";

function getData({ match, relayEnvironment }: GetDataArgs) {
	const storedFilters = getStoredSelectedSearchItems("deviceList");
	return loadQuery<DeviceListQuery>(
		relayEnvironment,
		DeviceListGraphQLQuery,
		{
			repositoryId: match.params.repositoryId,
			filter: {
				...storedFilters,
				userIds:
					storedFilters === undefined ? [CURRENT_USER_ID_PLACEHOLDER] : storedFilters.userIds,
			},
		},
		{ fetchPolicy: "store-and-network" }
	);
}

export default function Route(props: Props<typeof getData>) {
	return (
		<Suspense
			fallback={
				<DeviceListTemplate selectedTab={"flat"}>
					<EuiSkeletonText lines={10} />
				</DeviceListTemplate>
			}
		>
			<DeviceListPage queryRef={props.data} />
		</Suspense>
	);
}
