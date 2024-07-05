import { EuiLink } from "@elastic/eui";
import React from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { useRepoRouterHook } from "../../services/router/RepoRouterHook";

import type { UserLink$key } from "@/relay/UserLink.graphql";

const UserLinkGraphQLFragment = graphql`
	fragment UserLink on User {
		id
		name
	}
`;

export function UserLink(props: { user: UserLink$key }) {
	const { id, name } = useFragment(UserLinkGraphQLFragment, props.user);
	const { router, repositoryId } = useRepoRouterHook();

	const redirectToUser = () => {
		router.push("/repositories/:repositoryId/users/:userId", { repositoryId, userId: id });
	};

	return (
		<EuiLink href="#" onClick={redirectToUser}>
			{name}
		</EuiLink>
	);
}
