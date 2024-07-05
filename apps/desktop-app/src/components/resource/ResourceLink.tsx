import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiToolTip } from "@elastic/eui";
import React from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { useRepoRouterHook } from "../../services/router/RepoRouterHook";
import { Link } from "../Link";
import { AdactaIcon } from "../icons/AdactaIcon";

import type { ResourceLink$key } from "@/relay/ResourceLink.graphql";

const ResourceLinkGraphQLFragment = graphql`
	fragment ResourceLink on Resource {
		id
		name
		subName
	}
`;

interface IProps {
	resource: ResourceLink$key;
	prependIcon?: boolean;
	repositoryId?: string;
}

export function ResourceLink(props: IProps) {
	const resource = useFragment(ResourceLinkGraphQLFragment, props.resource);
	const { repositoryId } = useRepoRouterHook();
	return (
		<EuiToolTip content={resource.subName}>
			<Link
				to={[
					"/repositories/:repositoryId/resources/:resourceId",
					{ repositoryId, resourceId: resource.id },
				]}
			>
				<EuiFlexGroup alignItems="center" gutterSize={"xs"}>
					{props.prependIcon && (
						<EuiFlexItem grow={false}>
							<AdactaIcon type={"Resource"} />
						</EuiFlexItem>
					)}
					<EuiFlexItem>
						<EuiLink>{resource.name}</EuiLink>
					</EuiFlexItem>
				</EuiFlexGroup>
			</Link>
		</EuiToolTip>
	);
}
