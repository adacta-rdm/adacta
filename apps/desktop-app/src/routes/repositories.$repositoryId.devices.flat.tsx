import { EuiSkeletonText } from "@elastic/eui";
import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import type { IRouteComponentProps, IRouteGetDataFunctionArgs } from "../IRouteConfig";
import { DeviceListTemplate } from "../components/device/list/DeviceListTemplate";
import { DeviceList, DeviceListGraphQLQuery } from "../components/device/list/flat/DeviceList";

import type { DeviceListQuery } from "@/relay/DeviceListQuery.graphql";

export function getData({ match, relayEnvironment }: IRouteGetDataFunctionArgs) {
	return loadQuery<DeviceListQuery>(
		relayEnvironment,
		DeviceListGraphQLQuery,
		{ repositoryId: match.params.repositoryId },
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
			<DeviceList queryRef={props.data} />
		</Suspense>
	);
}
