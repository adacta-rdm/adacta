import { EuiSkeletonText } from "@elastic/eui";
import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import type { IRouteComponentProps, IRouteGetDataFunctionArgs } from "../IRouteConfig";
import { DeviceListTemplate } from "../components/device/list/DeviceListTemplate";
import { DeviceListGraphQLQuery } from "../components/device/list/flat/DeviceList";

import type { DeviceListQuery } from "@/relay/DeviceListQuery.graphql";
import { DeviceListPage } from "~/apps/desktop-app/src/components/device/list/flat/DeviceListPage";
import { getStoredSelectedSearchItems } from "~/apps/desktop-app/src/components/search/list/SearchBar";
import { CURRENT_USER_ID_PLACEHOLDER } from "~/lib/CURRENT_USER_ID_PLACEHOLDER";

export function getData({ match, relayEnvironment }: IRouteGetDataFunctionArgs) {
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

export default function (props: IRouteComponentProps<typeof getData>) {
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
