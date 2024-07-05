import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import type { IRouteComponentProps, IRouteGetDataFunctionArgs } from "../IRouteConfig";
import { Sample, SampleGraphQLQuery } from "../components/sample/Sample";
import { SamplePageLoading } from "../components/sample/SamplePageLoading";

import type { SampleQuery } from "@/relay/SampleQuery.graphql";

export function getData({ match, relayEnvironment }: IRouteGetDataFunctionArgs) {
	return loadQuery<SampleQuery>(
		relayEnvironment,
		SampleGraphQLQuery,
		{
			sampleId: match.params.sampleId,
			repositoryId: match.params.repositoryId,
		},
		{ fetchPolicy: "store-and-network" }
	);
}

export default function (props: IRouteComponentProps<typeof getData>) {
	return (
		<Suspense fallback={<SamplePageLoading />}>
			<Sample queryRef={props.data} />
		</Suspense>
	);
}
