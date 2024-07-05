import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import type { IRouteComponentProps, IRouteGetDataFunctionArgs } from "../IRouteConfig";
import { ImportWizard, ImportWizardGraphQLQuery } from "../components/importWizzard/ImportWizard";
import { ImportWizardLoading } from "../components/importWizzard/ImportWizardLoading";

import type { ImportWizardQuery } from "@/relay/ImportWizardQuery.graphql";
import type { IDeviceId, IResourceId } from "~/lib/database/Ids";

export function getData({ match, relayEnvironment }: IRouteGetDataFunctionArgs) {
	return loadQuery<ImportWizardQuery>(
		relayEnvironment,
		ImportWizardGraphQLQuery,
		{
			repositoryId: match.params.repositoryId,
			deviceId: match.params.deviceId,
		},
		{ fetchPolicy: "store-and-network" }
	);
}

export default function (props: IRouteComponentProps<typeof getData>) {
	const resourceId = props.match.params.resourceId as IResourceId;

	const deviceId = props.match.params.deviceId as IDeviceId;

	const queryRef = props.data;

	return (
		<Suspense fallback={<ImportWizardLoading />}>
			<ImportWizard resourceId={resourceId} deviceId={deviceId} queryRef={queryRef} />
		</Suspense>
	);
}
