import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import { ListPageLoading } from "../components/layout/ListPageLoading";
import { ResourceListGraphQLQuery } from "../components/resource/ResourceList";

import type { ResourceListQuery } from "@/relay/ResourceListQuery.graphql";
import type { GetDataArgs, Props } from "@/routes/repositories.$repositoryId.resources._index";
import { ResourceListPage } from "~/apps/desktop-app/src/components/resource/ResourceListPage";
import { getStoredSelectedSearchItems } from "~/apps/desktop-app/src/components/search/list/SearchBar";

function getData({ match, relayEnvironment }: GetDataArgs) {
	const storedFilters = getStoredSelectedSearchItems("resourcesList");

	return loadQuery<ResourceListQuery>(
		relayEnvironment,
		ResourceListGraphQLQuery,
		{
			repositoryId: match.params.repositoryId,
			filter: storedFilters,
		},
		{ fetchPolicy: "store-and-network" }
	);
}

export default function Route(props: Props<typeof getData>) {
	return (
		<Suspense fallback={<ListPageLoading pageTitle="Resources" />}>
			<ResourceListPage queryRef={props.data} />
		</Suspense>
	);
}
