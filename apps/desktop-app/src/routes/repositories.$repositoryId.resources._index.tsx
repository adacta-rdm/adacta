import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import type { IRouteComponentProps, IRouteGetDataFunctionArgs } from "../IRouteConfig";
import { ListPageLoading } from "../components/layout/ListPageLoading";
import { ResourceList, ResourceListGraphQLQuery } from "../components/resource/ResourceList";

import type { ResourceListQuery } from "@/relay/ResourceListQuery.graphql";

export function getData({ match, relayEnvironment }: IRouteGetDataFunctionArgs) {
	return loadQuery<ResourceListQuery>(
		relayEnvironment,
		ResourceListGraphQLQuery,
		{ repositoryId: match.params.repositoryId },
		{ fetchPolicy: "store-and-network" }
	);
}

export default function (props: IRouteComponentProps<typeof getData>) {
	return (
		<Suspense fallback={<ListPageLoading pageTitle="Resources" />}>
			<ResourceList queryRef={props.data} />
		</Suspense>
	);
}
