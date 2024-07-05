import { EuiSkeletonText } from "@elastic/eui";
import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import type { IRouteComponentProps, IRouteGetDataFunctionArgs } from "../IRouteConfig";
import {
	DeviceDefinitionList,
	DeviceDefinitionListGraphQLQuery,
} from "../components/device/definition/DeviceDefinitionList";
import { DeviceListTemplate } from "../components/device/list/DeviceListTemplate";

import type { DeviceDefinitionListQuery } from "@/relay/DeviceDefinitionListQuery.graphql";

export function getData({ match, relayEnvironment }: IRouteGetDataFunctionArgs) {
	return loadQuery<DeviceDefinitionListQuery>(
		relayEnvironment,
		DeviceDefinitionListGraphQLQuery,
		{ repositoryId: match.params.repositoryId },
		{ fetchPolicy: "store-and-network" }
	);
}

export default function (props: IRouteComponentProps<typeof getData>) {
	return (
		<Suspense
			fallback={
				<DeviceListTemplate selectedTab={"deviceDefinitions"}>
					<EuiSkeletonText lines={10} />
				</DeviceListTemplate>
			}
		>
			<DeviceDefinitionList queryRef={props.data} />
		</Suspense>
	);
}
