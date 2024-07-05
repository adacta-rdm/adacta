import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import type { IRouteComponentProps, IRouteGetDataFunctionArgs } from "../IRouteConfig";
import {
	NameCompositionOverview,
	NameCompositionOverviewGraphQLQuery,
	NameCompositionOverviewLoading,
} from "../components/nameComposition/NameCompositionOverview";

import type { NameCompositionOverviewQuery } from "@/relay/NameCompositionOverviewQuery.graphql";

export function getData({ match, relayEnvironment }: IRouteGetDataFunctionArgs) {
	return loadQuery<NameCompositionOverviewQuery>(
		relayEnvironment,
		NameCompositionOverviewGraphQLQuery,
		{
			repositoryId: match.params.repositoryId,
		}
	);
}

export default function (props: IRouteComponentProps<typeof getData>) {
	return (
		<Suspense fallback={<NameCompositionOverviewLoading />}>
			<NameCompositionOverview queryRef={props.data} />
		</Suspense>
	);
}
