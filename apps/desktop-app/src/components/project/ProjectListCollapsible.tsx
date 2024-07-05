import { EuiBadge, EuiBadgeGroup, EuiText } from "@elastic/eui";
import React, { useState } from "react";
import { graphql, useFragment } from "react-relay";

import { ProjectLink } from "./ProjectLink";

import type { ProjectListCollapsible$key } from "@/relay/ProjectListCollapsible.graphql";

export function ProjectListCollapsible(props: { data: ProjectListCollapsible$key }) {
	const data = useFragment(
		graphql`
			fragment ProjectListCollapsible on HasProjects {
				projects {
					edges {
						node {
							id
							...ProjectLinkFragment
						}
					}
				}
			}
		`,
		props.data
	);

	const [expand, setExpand] = useState(false);

	const edges = expand ? data.projects.edges : data.projects.edges.slice(0, 2);

	const hiddenCount = data.projects.edges.length - edges.length;

	return (
		<EuiBadgeGroup gutterSize={"s"}>
			{edges.map((edge) => (
				<ProjectLink key={edge.node.id} data={edge.node} badge />
			))}
			{hiddenCount > 0 && (
				<EuiBadge onClick={() => setExpand(!expand)} onClickAriaLabel={"Click to expand"}>
					<EuiText size={"xs"} color={"subdued"}>
						Show {hiddenCount} more
					</EuiText>
				</EuiBadge>
			)}
		</EuiBadgeGroup>
	);
}
