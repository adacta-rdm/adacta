import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import type { IRouteComponentProps, IRouteGetDataFunctionArgs } from "../IRouteConfig";
import { ListPageLoading } from "../components/layout/ListPageLoading";
import { SampleList, SampleListGraphQLQuery } from "../components/sample/SampleList";

import type { SampleListQuery } from "@/relay/SampleListQuery.graphql";

export function getData({ match, relayEnvironment }: IRouteGetDataFunctionArgs) {
	return loadQuery<SampleListQuery>(
		relayEnvironment,
		SampleListGraphQLQuery,
		{ repositoryId: match.params.repositoryId },
		{ fetchPolicy: "store-and-network" }
	);
}

export default function (props: IRouteComponentProps<typeof getData>) {
	return (
		<Suspense fallback={<ListPageLoading pageTitle="Samples" />}>
			<SampleList queryRef={props.data} />
		</Suspense>
	);
}
