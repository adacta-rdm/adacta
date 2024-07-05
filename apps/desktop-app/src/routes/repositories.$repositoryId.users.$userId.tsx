import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import type { IRouteComponentProps, IRouteGetDataFunctionArgs } from "../IRouteConfig";
import { UserProfile, UserProfileGraphQLQuery } from "../components/user/UserProfile";
import { UserProfileLoading } from "../components/user/UserProfileLoading";

import type { UserProfileQuery } from "@/relay/UserProfileQuery.graphql";

export function getData({ match, relayEnvironment }: IRouteGetDataFunctionArgs) {
	return loadQuery<UserProfileQuery>(
		relayEnvironment,
		UserProfileGraphQLQuery,
		{
			userId: match.params.userId,
			repositoryId: match.params.repositoryId,
		},
		{ fetchPolicy: "store-and-network" }
	);
}

export default function (props: IRouteComponentProps<typeof getData>) {
	return (
		<Suspense fallback={<UserProfileLoading />}>
			<UserProfile queryRef={props.data} />
		</Suspense>
	);
}
