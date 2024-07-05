import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import type { IRouteComponentProps, IRouteGetDataFunctionArgs } from "../IRouteConfig";
import { Resource, ResourceGraphQLQuery } from "../components/resource/Resource";
import { ResourcePageLoading } from "../components/resource/ResourcePageLoading";

import type { ResourceQuery } from "@/relay/ResourceQuery.graphql";

export function getData({ match, relayEnvironment }: IRouteGetDataFunctionArgs) {
	return loadQuery<ResourceQuery>(relayEnvironment, ResourceGraphQLQuery, {
		repositoryId: match.params.repositoryId,
		resourceId: match.params.resourceId,
		first: 10,
	});
}

export default function (props: IRouteComponentProps<typeof getData>) {
	return (
		<Suspense fallback={<ResourcePageLoading />}>
			<Resource queryRef={props.data} />
		</Suspense>
	);
}
