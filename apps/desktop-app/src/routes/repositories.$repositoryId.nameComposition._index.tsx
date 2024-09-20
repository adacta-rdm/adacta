import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import {
	NameCompositionOverview,
	NameCompositionOverviewGraphQLQuery,
	NameCompositionOverviewLoading,
} from "../components/nameComposition/NameCompositionOverview";

import type { NameCompositionOverviewQuery } from "@/relay/NameCompositionOverviewQuery.graphql";
import type {
	GetDataArgs,
	Props,
} from "@/routes/repositories.$repositoryId.nameComposition._index";

function getData({ match, relayEnvironment }: GetDataArgs) {
	return loadQuery<NameCompositionOverviewQuery>(
		relayEnvironment,
		NameCompositionOverviewGraphQLQuery,
		{
			repositoryId: match.params.repositoryId,
		}
	);
}

export default function Route(props: Props<typeof getData>) {
	return (
		<Suspense fallback={<NameCompositionOverviewLoading />}>
			<NameCompositionOverview queryRef={props.data} />
		</Suspense>
	);
}
