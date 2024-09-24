import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import { ListPageLoading } from "../components/layout/ListPageLoading";
import { SampleListGraphQLQuery } from "../components/sample/SampleList";

import type { SampleListQuery } from "@/relay/SampleListQuery.graphql";
import type { GetDataArgs, Props } from "@/routes/repositories.$repositoryId.samples._index";
import { SampleListPage } from "~/apps/desktop-app/src/components/sample/SampleListPage";
import { getStoredSelectedSearchItems } from "~/apps/desktop-app/src/components/search/list/SearchBar";
import { CURRENT_USER_ID_PLACEHOLDER } from "~/lib/CURRENT_USER_ID_PLACEHOLDER";

function getData({ match, relayEnvironment }: GetDataArgs) {
	const storedFilters = getStoredSelectedSearchItems("sampleList");
	return loadQuery<SampleListQuery>(
		relayEnvironment,
		SampleListGraphQLQuery,
		{
			repositoryId: match.params.repositoryId,
			filter: {
				...storedFilters,
				userIds:
					storedFilters === undefined ? [CURRENT_USER_ID_PLACEHOLDER] : storedFilters.userIds,
			},
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
