import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import type { IRouteComponentProps, IRouteGetDataFunctionArgs } from "../IRouteConfig";
import { ListPageLoading } from "../components/layout/ListPageLoading";
import { SampleListGraphQLQuery } from "../components/sample/SampleList";

import type { SampleListQuery } from "@/relay/SampleListQuery.graphql";
import { SampleListPage } from "~/apps/desktop-app/src/components/sample/SampleListPage";
import { getStoredSelectedSearchItems } from "~/apps/desktop-app/src/components/search/list/SearchBar";
import { CURRENT_USER_ID_PLACEHOLDER } from "~/lib/CURRENT_USER_ID_PLACEHOLDER";

export function getData({ match, relayEnvironment }: IRouteGetDataFunctionArgs) {
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

export default function (props: IRouteComponentProps<typeof getData>) {
	return (
		<Suspense fallback={<ListPageLoading pageTitle="Samples" />}>
			<SampleListPage queryRef={props.data} />
		</Suspense>
	);
}
