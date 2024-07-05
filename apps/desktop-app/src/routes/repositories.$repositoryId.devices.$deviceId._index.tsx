import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import type { IRouteComponentProps, IRouteGetDataFunctionArgs } from "../IRouteConfig";
import { Device, DeviceGraphQLQuery } from "../components/device/Device";
import { DevicePageLoading } from "../components/device/DevicePageLoading";

import type { DeviceQuery } from "@/relay/DeviceQuery.graphql";

export function getData({ match, relayEnvironment }: IRouteGetDataFunctionArgs) {
	return loadQuery<DeviceQuery>(relayEnvironment, DeviceGraphQLQuery, {
		deviceId: match.params.deviceId,
		repositoryId: match.params.repositoryId,
	});
}

export default function (props: IRouteComponentProps<typeof getData>) {
	return (
		<Suspense fallback={<DevicePageLoading />}>
			<Device queryRef={props.data} historyMode={false} />
		</Suspense>
	);
}
