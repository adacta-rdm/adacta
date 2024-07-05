import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import type { IRouteComponentProps, IRouteGetDataFunctionArgs } from "../IRouteConfig";
import { ListPageLoading } from "../components/layout/ListPageLoading";
import { ProjectList, ProjectListGraphQLQuery } from "../components/project/ProjectList";

import type { ProjectListQuery } from "@/relay/ProjectListQuery.graphql";

export function getData({ match, relayEnvironment }: IRouteGetDataFunctionArgs) {
	return loadQuery<ProjectListQuery>(
		relayEnvironment,
		ProjectListGraphQLQuery,
		{ repositoryId: match.params.repositoryId },
		{ fetchPolicy: "store-and-network" }
	);
}

export default function (props: IRouteComponentProps<typeof getData>) {
	return (
		<Suspense fallback={<ListPageLoading pageTitle="Projects" />}>
			<ProjectList queryRef={props.data} />
		</Suspense>
	);
}
