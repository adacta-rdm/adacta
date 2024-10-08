import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import { Resource, ResourceGraphQLQuery } from "../components/resource/Resource";
import { ResourcePageLoading } from "../components/resource/ResourcePageLoading";

import type { ResourceQuery } from "@/relay/ResourceQuery.graphql";
import type { GetDataArgs, Props } from "@/routes/repositories.$repositoryId.resources.$resourceId";

function getData({ match, relayEnvironment }: GetDataArgs) {
	return loadQuery<ResourceQuery>(relayEnvironment, ResourceGraphQLQuery, {
		repositoryId: match.params.repositoryId,
		resourceId: match.params.resourceId,
		first: 10,
	});
}

export default function Route(props: Props<typeof getData>) {
	return (
		<Suspense fallback={<ResourcePageLoading />}>
			<Resource queryRef={props.data} />
		</Suspense>
	);
}
