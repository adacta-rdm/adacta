import { EuiFlexGroup, EuiFlexItem, EuiPageTemplate } from "@elastic/eui";
import React from "react";
import { graphql } from "react-relay";
import type { PreloadedQuery } from "react-relay/hooks";
import { useFragment, usePreloadedQuery } from "react-relay/hooks";

import { ProjectTable } from "./ProjectTable";
import { AdactaPageTemplate } from "../layout/AdactaPageTemplate";

import type { ProjectList$key } from "@/relay/ProjectList.graphql";
import type { ProjectListQuery } from "@/relay/ProjectListQuery.graphql";
import { isNonNullish } from "~/lib/assert/isNonNullish";

const ProjectListGraphQLFragment = graphql`
	fragment ProjectList on RepositoryQuery
	@argumentDefinitions(first: { type: "Int!" }, after: { type: "String" }) {
		repository(id: $repositoryId) {
			projects(first: $first, after: $after) @connection(key: "ProjectList_projects") {
				__id
				edges {
					node {
						...ProjectTable
					}
				}
			}
		}
	}
`;

export const ProjectListGraphQLQuery = graphql`
	query ProjectListQuery($repositoryId: ID!) {
		...ProjectList @arguments(first: 25)
	}
`;

export function ProjectList(props: { queryRef: PreloadedQuery<ProjectListQuery> }) {
	const data = usePreloadedQuery(ProjectListGraphQLQuery, props.queryRef);
	const projects = useFragment<ProjectList$key>(ProjectListGraphQLFragment, data).repository;
	return (
		<AdactaPageTemplate>
			<EuiPageTemplate.Header
				pageTitle={
					<EuiFlexGroup alignItems="baseline" gutterSize="xs">
						<EuiFlexItem grow={false}>Projects</EuiFlexItem>
					</EuiFlexGroup>
				}
			/>
			<EuiPageTemplate.Section>
				<ProjectTable
					projects={projects.projects.edges.map((n) => n.node).filter(isNonNullish)}
					connections={[projects.projects.__id]}
				/>
			</EuiPageTemplate.Section>
		</AdactaPageTemplate>
	);
}
