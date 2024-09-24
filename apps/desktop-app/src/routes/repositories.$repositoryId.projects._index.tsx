import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import { ListPageLoading } from "../components/layout/ListPageLoading";
import { ProjectList, ProjectListGraphQLQuery } from "../components/project/ProjectList";

import type { ProjectListQuery } from "@/relay/ProjectListQuery.graphql";
import type { GetDataArgs, Props } from "@/routes/repositories.$repositoryId.projects._index";

function getData({ match, relayEnvironment }: GetDataArgs) {
	return loadQuery<ProjectListQuery>(
		relayEnvironment,
		ProjectListGraphQLQuery,
		{ repositoryId: match.params.repositoryId },
		{ fetchPolicy: "store-and-network" }
	);
}

export default function Route(props: Props<typeof getData>) {
	return (
		<Suspense fallback={<ListPageLoading pageTitle="Projects" />}>
			<ProjectList queryRef={props.data} />
		</Suspense>
	);
}
