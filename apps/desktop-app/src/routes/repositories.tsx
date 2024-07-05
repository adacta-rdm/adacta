import React from "react";
import { graphql, loadQuery } from "react-relay";
import { usePreloadedQuery } from "react-relay/hooks";

import type { IRouteComponentPropsWithChildren, IRouteGetDataFunctionArgs } from "../IRouteConfig";
import { RedirectException } from "../RedirectException";
import { AdactaBaseLayout } from "../components/layout/AdactaBaseLayout";

import type { repositoriesQuery } from "@/relay/repositoriesQuery.graphql";

// This route and all its sub-routes are for the authenticated user only.
export function getData({ match, relayEnvironment, graphQLHeaders }: IRouteGetDataFunctionArgs) {
	// Check whether the headers required to perform graphql queries are present.
	// If not, redirect to the login page
	// This must happen synchronously, otherwise sub routes will attempt to load and will fail due to the
	// missing headers
	if (!graphQLHeaders.authToken) {
		throw new RedirectException("/login");
	}
	graphQLHeaders.repositoryId = match.params.repositoryId;

	return loadQuery<repositoriesQuery>(relayEnvironment, repositoriesGraphQLQuery, {});
}

const repositoriesGraphQLQuery = graphql`
	query repositoriesQuery {
		...AdactaBaseLayoutFragment
	}
`;

export default function (props: IRouteComponentPropsWithChildren<typeof getData>) {
	const data = usePreloadedQuery(repositoriesGraphQLQuery, props.data);

	// return <div>Repositories</div>;

	return <AdactaBaseLayout data={data}>{props.children}</AdactaBaseLayout>;
}
