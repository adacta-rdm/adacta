import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import { ImportWizard, ImportWizardGraphQLQuery } from "../components/importWizzard/ImportWizard";
import { ImportWizardLoading } from "../components/importWizzard/ImportWizardLoading";

import type { ImportWizardQuery } from "@/relay/ImportWizardQuery.graphql";
import type {
	GetDataArgs,
	Props,
} from "@/routes/repositories.$repositoryId.devices.$deviceId.importer.$resourceId";
import type { IDeviceId, IResourceId } from "~/lib/database/Ids";

function getData({ match, relayEnvironment }: GetDataArgs) {
	return loadQuery<ImportWizardQuery>(
		relayEnvironment,
		ImportWizardGraphQLQuery,
		{
			deviceId: match.params.deviceId,
		},
		{ fetchPolicy: "store-and-network" }
	);
}

export default function Route(props: Props<typeof getData>) {
	const resourceId = props.match.params.resourceId as IResourceId;

	const deviceId = props.match.params.deviceId as IDeviceId;

	const queryRef = props.data;

	return (
		<Suspense fallback={<ImportWizardLoading />}>
			<ImportWizard resourceId={resourceId} deviceId={deviceId} queryRef={queryRef} />
		</Suspense>
	);
}
