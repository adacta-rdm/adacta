import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import { Device, DeviceGraphQLQuery } from "../components/device/Device";
import { DevicePageLoading } from "../components/device/DevicePageLoading";

import type { DeviceQuery } from "@/relay/DeviceQuery.graphql";
import type {
	GetDataArgs,
	Props,
} from "@/routes/repositories.$repositoryId.devices.$deviceId._index";

function getData({ match, relayEnvironment }: GetDataArgs) {
	return loadQuery<DeviceQuery>(relayEnvironment, DeviceGraphQLQuery, {
		deviceId: match.params.deviceId,
		repositoryId: match.params.repositoryId,
	});
}

export default function Route(props: Props<typeof getData>) {
	return (
		<Suspense fallback={<DevicePageLoading />}>
			<Device queryRef={props.data} historyMode={false} />
		</Suspense>
	);
}
