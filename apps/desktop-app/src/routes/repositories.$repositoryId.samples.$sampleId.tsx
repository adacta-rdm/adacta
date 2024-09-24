import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import { Sample, SampleGraphQLQuery } from "../components/sample/Sample";
import { SamplePageLoading } from "../components/sample/SamplePageLoading";

import type { SampleQuery } from "@/relay/SampleQuery.graphql";
import type { GetDataArgs, Props } from "@/routes/repositories.$repositoryId.samples.$sampleId";

function getData({ match, relayEnvironment }: GetDataArgs) {
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

export default function Route(props: Props<typeof getData>) {
	return (
		<Suspense fallback={<SamplePageLoading />}>
			<Sample queryRef={props.data} />
		</Suspense>
	);
}
