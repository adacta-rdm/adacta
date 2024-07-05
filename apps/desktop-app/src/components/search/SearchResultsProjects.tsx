import React from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import type { ISearchResultProps } from "./SearchResult";
import { SearchResult } from "./SearchResult";

import type { SearchResultsProjects$key } from "@/relay/SearchResultsProjects.graphql";

const SearchResultsProjectsGraphQLFragment = graphql`
	fragment SearchResultsProjects on Node {
		... on Project {
			__typename
			id
			name
			metadata {
				creator {
					id
					name
				}
			}
			...SearchResult
		}
	}
`;

export function SearchResultsProjects(props: {
	searchResults: SearchResultsProjects$key;
	repositoryId: string;
	close: () => void;
}) {
	const node = useFragment(SearchResultsProjectsGraphQLFragment, props.searchResults);

	if (node.__typename !== "Project") {
		return null;
	}
	return (
		<SearchResult
			title={node.name}
			link={[
				"/repositories/:repositoryId/projects/:projectId",
				{ repositoryId: props.repositoryId, projectId: node.id },
			]}
			iconType={"Project"}
			close={props.close}
			metadata={node}
			properties={(() => {
				const properties: ISearchResultProps["properties"] = [
					{
						text: node.metadata.creator.name,
						link: [
							"/repositories/:repositoryId/users/:userId",
							{ repositoryId: props.repositoryId, userId: node.metadata.creator.id },
						],
						iconType: "User",
					},
				];
				return properties;
			})()}
		/>
	);
}
