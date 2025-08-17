import React from "react";
import { loadQuery } from "react-relay";

import {
	GamryImport,
	GamryImportGraphqlQuery,
} from "../components/importWizzard/gamryDta/GamryImport";

import type { GamryImportQuery } from "@/relay/GamryImportQuery.graphql";
import type {
	GetDataArgs,
	Props,
} from "@/routes/repositories.$repositoryId.devices.$deviceId.gamry.$resourceId";
import type { IDeviceId, IResourceId } from "~/lib/database/Ids";

export function getData({ match, relayEnvironment }: GetDataArgs) {
	return loadQuery<GamryImportQuery>(
		relayEnvironment,
		GamryImportGraphqlQuery,
		{
			deviceId: match.params.deviceId,
			resourceId: match.params.resourceId,
		},
		{ fetchPolicy: "store-and-network" }
	);
}

export default function Route(props: Props<typeof getData>) {
	return (
		<GamryImport
			data={props.data}
			deviceId={props.match.params.deviceId as IDeviceId}
			resourceId={props.match.params.resourceId as IResourceId}
		/>
	);
}
