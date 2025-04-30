import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import { ListPageLoading } from "../components/layout/ListPageLoading";
import { SampleListGraphQLQuery } from "../components/sample/SampleList";

import type { SampleListQuery } from "@/relay/SampleListQuery.graphql";
import type { GetDataArgs, Props } from "@/routes/repositories.$repositoryId.samples._index";
import { SampleListPage } from "~/apps/desktop-app/src/components/sample/SampleListPage";
import { getStoredSelectedSearchItems } from "~/apps/desktop-app/src/components/search/list/SearchBar";

function getData({ match, relayEnvironment }: GetDataArgs) {
	const storedFilters = getStoredSelectedSearchItems("sampleList");
	return loadQuery<SampleListQuery>(
		relayEnvironment,
		SampleListGraphQLQuery,
		{
			repositoryId: match.params.repositoryId,
			filter: storedFilters,
		},
		{ fetchPolicy: "store-and-network" }
	);
}

export default function Route(props: Props<typeof getData>) {
	return (
		<Suspense fallback={<ListPageLoading pageTitle="Samples" />}>
			<SampleListPage queryRef={props.data} />
		</Suspense>
	);
}
