import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import { UserProfile, UserProfileGraphQLQuery } from "../components/user/UserProfile";
import { UserProfileLoading } from "../components/user/UserProfileLoading";

import type { UserProfileQuery } from "@/relay/UserProfileQuery.graphql";
import type { GetDataArgs, Props } from "@/routes/repositories.$repositoryId.users.$userId";

function getData({ match, relayEnvironment }: GetDataArgs) {
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

export default function Route(props: Props<typeof getData>) {
	return (
		<Suspense fallback={<UserProfileLoading />}>
			<UserProfile queryRef={props.data} />
		</Suspense>
	);
}
