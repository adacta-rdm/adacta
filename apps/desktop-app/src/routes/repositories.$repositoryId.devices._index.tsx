import { EuiSkeletonText } from "@elastic/eui";
import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import type { IRouteComponentProps, IRouteGetDataFunctionArgs } from "../IRouteConfig";
import { DeviceListTemplate } from "../components/device/list/DeviceListTemplate";
import {
	DeviceListHierarchical,
	DeviceListHierarchicalGraphQLQuery,
} from "../components/device/list/hierarchical/DeviceListHierarchical";

import type { DeviceListHierarchicalQuery } from "@/relay/DeviceListHierarchicalQuery.graphql";

export function getData({ match, relayEnvironment }: IRouteGetDataFunctionArgs) {
	return loadQuery<DeviceListHierarchicalQuery>(
		relayEnvironment,
		DeviceListHierarchicalGraphQLQuery,
		{ repositoryId: match.params.repositoryId, first: 5 },
		{ fetchPolicy: "store-and-network" }
	);
}

export default function (props: IRouteComponentProps<typeof getData>) {
	return (
		<Suspense
			fallback={
				<DeviceListTemplate selectedTab={"hierarchical"}>
					<EuiSkeletonText lines={10} />
				</DeviceListTemplate>
			}
		>
			<DeviceListHierarchical queryRef={props.data} />
		</Suspense>
	);
}
