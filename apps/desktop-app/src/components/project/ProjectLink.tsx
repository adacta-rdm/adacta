import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink } from "@elastic/eui";
import React from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { useRepoRouterHook } from "../../services/router/RepoRouterHook";
import { AdactaIcon } from "../icons/AdactaIcon";

import type { ProjectLinkFragment$key } from "@/relay/ProjectLinkFragment.graphql";

interface IProps {
	data: ProjectLinkFragment$key;

	prependIcon?: boolean;
	repositoryId?: string;

	badge?: boolean;
}

export function ProjectLink(props: IProps) {
	const { router, repositoryId } = useRepoRouterHook();
	const data = useFragment(
		graphql`
			fragment ProjectLinkFragment on Project {
				id
				name
			}
		`,
		props.data
	);

	const onClick = () =>
		router.push("/repositories/:repositoryId/projects/:projectId", {
			repositoryId,
			projectId: data.id,
		});

	return props.badge ? (
		<EuiBadge onClick={onClick} onClickAriaLabel={`Click to view the ${data.name} project`}>
			{data.name}
		</EuiBadge>
	) : (
		<EuiLink onClick={onClick}>
			<EuiFlexGroup alignItems="center" gutterSize={"xs"}>
				{props.prependIcon && (
					<EuiFlexItem grow={false}>
						<AdactaIcon type={"Project"} />
					</EuiFlexItem>
				)}
				<EuiFlexItem>{data.name}</EuiFlexItem>
			</EuiFlexGroup>
		</EuiLink>
	);
}
