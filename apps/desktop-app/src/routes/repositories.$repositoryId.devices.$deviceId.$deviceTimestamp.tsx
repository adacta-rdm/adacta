import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import { Device, DeviceGraphQLQuery } from "../components/device/Device";
import { DevicePageLoading } from "../components/device/DevicePageLoading";

import type { DeviceQuery } from "@/relay/DeviceQuery.graphql";
import type {
	GetDataArgs,
	Props,
} from "@/routes/repositories.$repositoryId.devices.$deviceId.$deviceTimestamp";
import { createIDatetime } from "~/lib/createDate";

function getData({ match, relayEnvironment }: GetDataArgs) {
	const timeStamp = new Date(match.params.deviceTimestamp);
	return {
		queryRef: loadQuery<DeviceQuery>(relayEnvironment, DeviceGraphQLQuery, {
			repositoryId: match.params.repositoryId,
			deviceId: match.params.deviceId,
			time: createIDatetime(timeStamp),
		}),
		viewTimestamp: timeStamp,
	};
}

export default function Route(props: Props<typeof getData>) {
	const queryRef = props.data.queryRef;
	const viewTimeStamp = props.data.viewTimestamp; //as Date;
	return (
		<Suspense fallback={<DevicePageLoading />}>
			<Device queryRef={queryRef} viewTimeStamp={viewTimeStamp} historyMode={true} />
		</Suspense>
	);
}
